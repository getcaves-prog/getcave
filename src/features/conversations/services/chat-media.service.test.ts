import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadChatMedia } from "./chat-media.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockStorageFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: mockStorageFrom,
    },
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();

  // Default: authenticated user
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-abc-123" } },
    error: null,
  });

  // Default: upload succeeds
  mockUpload.mockResolvedValue({ data: { path: "some/path" }, error: null });

  // Default: public URL
  mockGetPublicUrl.mockReturnValue({
    data: { publicUrl: "https://storage.example.com/chat-media/user-abc-123/conv-1/uuid.webm" },
  });

  // Chain: storage.from("chat-media") → { upload, getPublicUrl }
  mockStorageFrom.mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  });
});

// ─── Helper: create a mock File ────────────────────────────────────────────
function makeFile(name: string, type: string, size: number): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

// ─── uploadChatMedia ───────────────────────────────────────────────────────
describe("uploadChatMedia", () => {
  // ── Path construction ────────────────────────────────────────────────────

  it("uploads to chat-media bucket under uid/conversationId/uuid.ext path", async () => {
    const file = makeFile("voice.webm", "audio/webm", 1024);

    await uploadChatMedia("conv-1", file, "audio");

    expect(mockStorageFrom).toHaveBeenCalledWith("chat-media");

    // path must start with uid first (RLS requirement)
    const uploadPath: string = mockUpload.mock.calls[0][0];
    expect(uploadPath).toMatch(/^user-abc-123\/conv-1\/.+\.webm$/);
  });

  it("uses uid as first path segment (RLS enforcement)", async () => {
    const file = makeFile("photo.jpg", "image/jpeg", 2048);

    await uploadChatMedia("conv-xyz", file, "image");

    const uploadPath: string = mockUpload.mock.calls[0][0];
    const segments = uploadPath.split("/");
    // [uid, conversationId, filename]
    expect(segments[0]).toBe("user-abc-123");
    expect(segments[1]).toBe("conv-xyz");
  });

  it("uses the correct extension for image/png", async () => {
    const file = makeFile("screenshot.png", "image/png", 512);

    await uploadChatMedia("conv-1", file, "image");

    const uploadPath: string = mockUpload.mock.calls[0][0];
    expect(uploadPath).toMatch(/\.png$/);
  });

  it("uses the correct extension for audio/mpeg", async () => {
    const file = makeFile("track.mp3", "audio/mpeg", 512);

    await uploadChatMedia("conv-1", file, "audio");

    const uploadPath: string = mockUpload.mock.calls[0][0];
    expect(uploadPath).toMatch(/\.mp3$/);
  });

  // ── Return shape ─────────────────────────────────────────────────────────

  it("returns url, type, and sizeBytes on success (image)", async () => {
    const file = makeFile("pic.webp", "image/webp", 4096);
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://storage.example.com/chat-media/user-abc-123/conv-1/uuid.webp" },
    });

    const result = await uploadChatMedia("conv-1", file, "image");

    expect(result.url).toBe(
      "https://storage.example.com/chat-media/user-abc-123/conv-1/uuid.webp"
    );
    expect(result.type).toBe("image");
    expect(result.sizeBytes).toBe(4096);
    expect(result.durationSeconds).toBeUndefined();
  });

  it("returns url, type, sizeBytes on success (audio — no duration by default)", async () => {
    const file = makeFile("note.webm", "audio/webm", 8192);

    const result = await uploadChatMedia("conv-2", file, "audio");

    expect(result.type).toBe("audio");
    expect(result.sizeBytes).toBe(8192);
    // durationSeconds is not derivable from a File object — must be passed in opts
    expect(result.durationSeconds).toBeUndefined();
  });

  // ── Validation — no network calls before reject ───────────────────────────

  it("rejects file over 10MB without hitting storage", async () => {
    const TEN_MB = 10 * 1024 * 1024;
    const file = makeFile("big.jpg", "image/jpeg", TEN_MB + 1);

    await expect(uploadChatMedia("conv-1", file, "image")).rejects.toThrow();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("accepts file of exactly 10MB", async () => {
    const TEN_MB = 10 * 1024 * 1024;
    const file = makeFile("edge.jpg", "image/jpeg", TEN_MB);

    await uploadChatMedia("conv-1", file, "image");

    expect(mockUpload).toHaveBeenCalled();
  });

  it("rejects wrong mime for kind=image (audio/* file)", async () => {
    const file = makeFile("sound.mp3", "audio/mpeg", 1024);

    await expect(uploadChatMedia("conv-1", file, "image")).rejects.toThrow();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects wrong mime for kind=audio (image/* file)", async () => {
    const file = makeFile("photo.jpg", "image/jpeg", 1024);

    await expect(uploadChatMedia("conv-1", file, "audio")).rejects.toThrow();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects unsupported mime type (video/*) for either kind", async () => {
    const file = makeFile("movie.mp4", "video/mp4", 1024);

    await expect(uploadChatMedia("conv-1", file, "image")).rejects.toThrow();
    await expect(uploadChatMedia("conv-1", file, "audio")).rejects.toThrow();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const file = makeFile("voice.webm", "audio/webm", 512);

    await expect(uploadChatMedia("conv-1", file, "audio")).rejects.toThrow();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  // ── Storage errors ───────────────────────────────────────────────────────

  it("throws when storage upload fails", async () => {
    mockUpload.mockResolvedValue({ data: null, error: { message: "bucket not found" } });
    const file = makeFile("photo.png", "image/png", 512);

    await expect(uploadChatMedia("conv-1", file, "image")).rejects.toThrow(
      "bucket not found"
    );
  });
});
