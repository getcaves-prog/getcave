import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listEventMedia,
  uploadRecapMedia,
  deleteRecapMedia,
  listCommunityRecaps,
} from "./recaps.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockSingle = vi.fn();
const mockGetUser = vi.fn();

// Storage mocks
const mockStorageUpload = vi.fn();
const mockStorageGetPublicUrl = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    storage: {
      from: mockStorageFrom,
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

  // Default storage chain: storage.from("recaps").upload(...) → storage.from("recaps").getPublicUrl(...)
  mockStorageUpload.mockResolvedValue({ data: { path: "user-1/flyer-1/abc.jpg" }, error: null });
  mockStorageGetPublicUrl.mockReturnValue({
    data: { publicUrl: "https://cdn.example.com/recaps/user-1/flyer-1/abc.jpg" },
  });
  mockStorageRemove.mockResolvedValue({ data: null, error: null });
  mockStorageFrom.mockReturnValue({
    upload: mockStorageUpload,
    getPublicUrl: mockStorageGetPublicUrl,
    remove: mockStorageRemove,
  });
});

// ─── Helper: create a mock File ────────────────────────────────────────────
function makeFile(
  name: string,
  type: string,
  sizeBytes: number = 1024
): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

// ─── listEventMedia ────────────────────────────────────────────────────────
describe("listEventMedia", () => {
  const mockMedia = [
    {
      id: "m1",
      flyer_id: "flyer-1",
      uploaded_by: "user-1",
      media_url: "https://cdn.example.com/recaps/img1.jpg",
      media_type: "image",
      thumbnail_url: null,
      created_at: "2026-06-01T10:00:00Z",
    },
    {
      id: "m2",
      flyer_id: "flyer-1",
      uploaded_by: "user-2",
      media_url: "https://cdn.example.com/recaps/vid1.mp4",
      media_type: "video",
      thumbnail_url: "https://cdn.example.com/recaps/vid1-thumb.jpg",
      created_at: "2026-06-01T09:00:00Z",
    },
  ];

  beforeEach(() => {
    mockOrder.mockResolvedValue({ data: mockMedia, error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("queries event_media by flyer_id ordered by created_at desc", async () => {
    const result = await listEventMedia("flyer-1");

    expect(mockFrom).toHaveBeenCalledWith("event_media");
    expect(mockEq).toHaveBeenCalledWith("flyer_id", "flyer-1");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toHaveLength(2);
    expect(result[0].media_type).toBe("image");
  });

  it("returns empty array when data is null without error", async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });

    const result = await listEventMedia("flyer-1");

    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: "DB error" } });

    await expect(listEventMedia("flyer-1")).rejects.toThrow(
      "Failed to list event media: DB error"
    );
  });
});

// ─── uploadRecapMedia ──────────────────────────────────────────────────────
describe("uploadRecapMedia", () => {
  const mockInsertedRow = {
    id: "m-new",
    flyer_id: "flyer-1",
    uploaded_by: "user-1",
    media_url: "https://cdn.example.com/recaps/user-1/flyer-1/abc.jpg",
    media_type: "image",
    thumbnail_url: null,
    created_at: "2026-06-01T12:00:00Z",
  };

  beforeEach(() => {
    mockSingle.mockResolvedValue({ data: mockInsertedRow, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("uploads to storage with path prefix uid/flyerId/uuid.ext", async () => {
    const file = makeFile("party.jpg", "image/jpeg");

    await uploadRecapMedia("flyer-1", file);

    expect(mockStorageFrom).toHaveBeenCalledWith("recaps");
    const uploadCall = mockStorageUpload.mock.calls[0];
    const uploadedPath: string = uploadCall[0];
    // Must start with userId segment
    expect(uploadedPath.startsWith("user-1/flyer-1/")).toBe(true);
    // Must end with .jpg extension
    expect(uploadedPath.endsWith(".jpg")).toBe(true);
  });

  it("derives media_type='image' from image/* mime", async () => {
    const file = makeFile("photo.png", "image/png");

    await uploadRecapMedia("flyer-1", file);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ media_type: "image" })
    );
  });

  it("derives media_type='video' from video/* mime", async () => {
    const file = makeFile("clip.mp4", "video/mp4");

    await uploadRecapMedia("flyer-1", file);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ media_type: "video" })
    );
  });

  it("rejects file exceeding 10MB WITHOUT uploading to storage", async () => {
    const oversizedFile = makeFile("huge.jpg", "image/jpeg", 11 * 1024 * 1024);

    await expect(uploadRecapMedia("flyer-1", oversizedFile)).rejects.toThrow(
      "10MB"
    );
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("rejects invalid MIME type WITHOUT uploading to storage", async () => {
    const pdfFile = makeFile("doc.pdf", "application/pdf");

    await expect(uploadRecapMedia("flyer-1", pdfFile)).rejects.toThrow(
      "imagen o video"
    );
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const file = makeFile("photo.jpg", "image/jpeg");

    await expect(uploadRecapMedia("flyer-1", file)).rejects.toThrow(
      "Tenés que iniciar sesión"
    );
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("inserts event_media row with correct fields after upload", async () => {
    const file = makeFile("photo.jpg", "image/jpeg");

    const result = await uploadRecapMedia("flyer-1", file);

    expect(mockFrom).toHaveBeenCalledWith("event_media");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        flyer_id: "flyer-1",
        uploaded_by: "user-1",
        media_type: "image",
      })
    );
    expect(result.id).toBe("m-new");
  });

  it("throws on storage upload error WITHOUT inserting DB row", async () => {
    mockStorageUpload.mockResolvedValue({ data: null, error: { message: "Storage limit reached" } });
    const file = makeFile("photo.jpg", "image/jpeg");

    await expect(uploadRecapMedia("flyer-1", file)).rejects.toThrow(
      "Failed to upload media: Storage limit reached"
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws on DB insert error", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "RLS denied" } });
    const file = makeFile("photo.jpg", "image/jpeg");

    await expect(uploadRecapMedia("flyer-1", file)).rejects.toThrow(
      "Failed to save media record: RLS denied"
    );
  });
});

// ─── deleteRecapMedia ──────────────────────────────────────────────────────
describe("deleteRecapMedia", () => {
  const MEDIA_URL =
    "https://proj.supabase.co/storage/v1/object/public/recaps/user-1/flyer-1/uuid.jpg";

  // Helpers to set up the fetch (select/eq/single) and delete (delete/eq) chains
  const mockFetchSingle = vi.fn();
  const mockFetchEq = vi.fn();
  const mockFetchSelect = vi.fn();
  const mockDeleteEq = vi.fn();

  function setupDelete(
    fetchResult: { data: unknown; error: unknown },
    deleteResult: { error: unknown } = { error: null }
  ) {
    mockFetchSingle.mockResolvedValue(fetchResult);
    mockFetchEq.mockReturnValue({ single: mockFetchSingle });
    mockFetchSelect.mockReturnValue({ eq: mockFetchEq });

    mockDeleteEq.mockResolvedValue(deleteResult);
    mockDelete.mockReturnValue({ eq: mockDeleteEq });

    // from("event_media") is called twice: once for fetch (select), once for delete
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "event_media") {
        callCount++;
        if (callCount === 1) return { select: mockFetchSelect };
        return { delete: mockDelete };
      }
      return {};
    });
  }

  it("fetches the row first, then deletes the DB row by id", async () => {
    setupDelete({ data: { id: "m-1", media_url: MEDIA_URL }, error: null });

    await deleteRecapMedia("m-1");

    expect(mockFrom).toHaveBeenCalledWith("event_media");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalledWith("id", "m-1");
  });

  it("calls storage.remove with the correct path after DB delete", async () => {
    setupDelete({ data: { id: "m-1", media_url: MEDIA_URL }, error: null });

    await deleteRecapMedia("m-1");

    expect(mockStorageFrom).toHaveBeenCalledWith("recaps");
    expect(mockStorageRemove).toHaveBeenCalledWith(["user-1/flyer-1/uuid.jpg"]);
  });

  it("extracts storage path from Supabase public URL correctly", async () => {
    const url =
      "https://xyzabc.supabase.co/storage/v1/object/public/recaps/a/b/c/file.mp4";
    setupDelete({ data: { id: "m-2", media_url: url }, error: null });

    await deleteRecapMedia("m-2");

    expect(mockStorageRemove).toHaveBeenCalledWith(["a/b/c/file.mp4"]);
  });

  it("does not call storage.remove when media_url is null", async () => {
    setupDelete({ data: { id: "m-3", media_url: null }, error: null });

    await deleteRecapMedia("m-3");

    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it("does not throw when storage.remove fails (best-effort cleanup)", async () => {
    setupDelete({ data: { id: "m-4", media_url: MEDIA_URL }, error: null });
    mockStorageRemove.mockResolvedValue({ data: null, error: { message: "Not found" } });

    // Should not throw — DB delete already succeeded
    await expect(deleteRecapMedia("m-4")).resolves.toBeUndefined();
  });

  it("throws on fetch error", async () => {
    setupDelete({ data: null, error: { message: "RLS denied" } });

    await expect(deleteRecapMedia("m-1")).rejects.toThrow(
      "Failed to delete media: RLS denied"
    );
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("throws on DB delete error", async () => {
    setupDelete(
      { data: { id: "m-1", media_url: MEDIA_URL }, error: null },
      { error: { message: "FK constraint" } }
    );

    await expect(deleteRecapMedia("m-1")).rejects.toThrow(
      "Failed to delete media: FK constraint"
    );
    // Storage should NOT be cleaned up if DB delete failed
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });
});

// ─── listCommunityRecaps ────────────────────────────────────────────────────
describe("listCommunityRecaps", () => {
  const mockMediaRows = [
    {
      id: "m1",
      flyer_id: "flyer-1",
      uploaded_by: "user-1",
      media_url: "https://cdn.example.com/recaps/img1.jpg",
      media_type: "image",
      thumbnail_url: null,
      created_at: "2026-06-07T10:00:00Z",
    },
    {
      id: "m2",
      flyer_id: "flyer-2",
      uploaded_by: "user-2",
      media_url: "https://cdn.example.com/recaps/vid1.mp4",
      media_type: "video",
      thumbnail_url: null,
      created_at: "2026-06-06T10:00:00Z",
    },
  ];

  // Helper: wire the two-query chain for a happy path
  function setupHappyPath(
    flyerIds: string[],
    media: typeof mockMediaRows = mockMediaRows
  ) {
    const flyerRows = flyerIds.map((id) => ({ id }));

    // First call: flyers query — select("id").eq("community_id", ...)
    const mockFlyerEq = vi.fn().mockResolvedValue({ data: flyerRows, error: null });
    const mockFlyerSelect = vi.fn().mockReturnValue({ eq: mockFlyerEq });

    // Second call: event_media query — select("*").in(...).order(...).limit(...)
    const mockLimit = vi.fn().mockResolvedValue({ data: media, error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
    const mockMediaSelect = vi.fn().mockReturnValue({ in: mockIn });

    mockFrom
      .mockReturnValueOnce({ select: mockFlyerSelect })
      .mockReturnValueOnce({ select: mockMediaSelect });

    return { mockFlyerEq, mockIn, mockOrder, mockLimit };
  }

  it("fetches flyers for the community then queries event_media", async () => {
    const { mockFlyerEq, mockIn } = setupHappyPath(["flyer-1", "flyer-2"]);

    await listCommunityRecaps("community-1");

    expect(mockFrom).toHaveBeenNthCalledWith(1, "flyers");
    expect(mockFlyerEq).toHaveBeenCalledWith("community_id", "community-1");
    expect(mockFrom).toHaveBeenNthCalledWith(2, "event_media");
    expect(mockIn).toHaveBeenCalledWith("flyer_id", ["flyer-1", "flyer-2"]);
  });

  it("returns media ordered newest-first with default limit 12", async () => {
    const { mockOrder, mockLimit } = setupHappyPath(["flyer-1", "flyer-2"]);

    const result = await listCommunityRecaps("community-1");

    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(12);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("m1");
  });

  it("respects a custom limit", async () => {
    const { mockLimit } = setupHappyPath(["flyer-1"]);

    await listCommunityRecaps("community-1", 5);

    expect(mockLimit).toHaveBeenCalledWith(5);
  });

  it("returns empty array when community has no flyers", async () => {
    const mockFlyerEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockFlyerSelect = vi.fn().mockReturnValue({ eq: mockFlyerEq });
    mockFrom.mockReturnValue({ select: mockFlyerSelect });

    const result = await listCommunityRecaps("community-empty");

    expect(result).toEqual([]);
    // event_media should NOT be queried when there are no flyers
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when data from event_media is null", async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
    const mockMediaSelect = vi.fn().mockReturnValue({ in: mockIn });

    const mockFlyerEq = vi.fn().mockResolvedValue({ data: [{ id: "flyer-1" }], error: null });
    const mockFlyerSelect = vi.fn().mockReturnValue({ eq: mockFlyerEq });

    mockFrom
      .mockReturnValueOnce({ select: mockFlyerSelect })
      .mockReturnValueOnce({ select: mockMediaSelect });

    const result = await listCommunityRecaps("community-1");

    expect(result).toEqual([]);
  });

  it("throws on flyers query error", async () => {
    const mockFlyerEq = vi.fn().mockResolvedValue({ data: null, error: { message: "RLS denied" } });
    const mockFlyerSelect = vi.fn().mockReturnValue({ eq: mockFlyerEq });
    mockFrom.mockReturnValue({ select: mockFlyerSelect });

    await expect(listCommunityRecaps("community-1")).rejects.toThrow(
      "Failed to get community flyers: RLS denied"
    );
  });

  it("throws on event_media query error", async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: null, error: { message: "Timeout" } });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
    const mockMediaSelect = vi.fn().mockReturnValue({ in: mockIn });

    const mockFlyerEq = vi.fn().mockResolvedValue({ data: [{ id: "flyer-1" }], error: null });
    const mockFlyerSelect = vi.fn().mockReturnValue({ eq: mockFlyerEq });

    mockFrom
      .mockReturnValueOnce({ select: mockFlyerSelect })
      .mockReturnValueOnce({ select: mockMediaSelect });

    await expect(listCommunityRecaps("community-1")).rejects.toThrow(
      "Failed to get community recaps: Timeout"
    );
  });
});
