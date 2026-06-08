import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  toggleSaveFlyer,
  isFlyerSaved,
  getSavedFlyers,
  getFlyerSaveCount,
} from "./favorites.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockIn = vi.fn();
const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

// ─── getFlyerSaveCount ────────────────────────────────────────────────────────
describe("getFlyerSaveCount", () => {
  it("calls flyer_save_count RPC with p_flyer_id and returns the count", async () => {
    mockRpc.mockResolvedValue({ data: 5, error: null });

    const result = await getFlyerSaveCount("flyer-abc");

    expect(mockRpc).toHaveBeenCalledWith("flyer_save_count", {
      p_flyer_id: "flyer-abc",
    });
    expect(result).toBe(5);
  });

  it("returns 0 when RPC returns null data", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await getFlyerSaveCount("flyer-abc");

    expect(result).toBe(0);
  });

  it("throws with a descriptive message on RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "DB error" } });

    await expect(getFlyerSaveCount("flyer-abc")).rejects.toThrow(
      "Failed to get flyer save count: DB error"
    );
  });

  it("returns 0 when no flyer has been saved", async () => {
    mockRpc.mockResolvedValue({ data: 0, error: null });

    const result = await getFlyerSaveCount("flyer-no-saves");

    expect(result).toBe(0);
  });
});

// ─── toggleSaveFlyer ─────────────────────────────────────────────────────────
describe("toggleSaveFlyer", () => {
  beforeEach(() => {
    // Default: delete chain returns ok
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ eq: mockDeleteEq });
  });

  it("returns false (unauthenticated) when user is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await toggleSaveFlyer("flyer-1");

    expect(result).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("deletes existing save and returns false (unsaved)", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ eq: mockDeleteEq });
    mockMaybeSingle.mockResolvedValue({ data: { id: "save-1" }, error: null });
    mockEq.mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }) });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ delete: mockDelete });

    const result = await toggleSaveFlyer("flyer-1");

    expect(result).toBe(false);
    expect(mockDelete).toHaveBeenCalled();
  });

  it("inserts a new save and returns true (saved)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const mockEqChain = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockEq.mockReturnValueOnce({ eq: mockEqChain });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ insert: mockInsert });

    const result = await toggleSaveFlyer("flyer-1");

    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", flyer_id: "flyer-1" })
    );
  });
});

// ─── isFlyerSaved ─────────────────────────────────────────────────────────────
describe("isFlyerSaved", () => {
  it("returns false when user is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await isFlyerSaved("flyer-1");

    expect(result).toBe(false);
  });

  it("returns true when a save row exists", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "save-1" }, error: null });
    const mockEqChain = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockEq.mockReturnValue({ eq: mockEqChain });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await isFlyerSaved("flyer-1");

    expect(result).toBe(true);
  });

  it("returns false when no save row exists", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const mockEqChain = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockEq.mockReturnValue({ eq: mockEqChain });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await isFlyerSaved("flyer-1");

    expect(result).toBe(false);
  });
});

// ─── getSavedFlyers ───────────────────────────────────────────────────────────
describe("getSavedFlyers", () => {
  it("returns empty array when user is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await getSavedFlyers();

    expect(result).toEqual([]);
  });

  it("returns empty array when no saved rows exist", async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getSavedFlyers();

    expect(result).toEqual([]);
  });

  it("returns flyers in saved order", async () => {
    const savedRows = [{ flyer_id: "f1" }, { flyer_id: "f2" }];
    const flyers = [
      { id: "f2", image_url: "img2.jpg" },
      { id: "f1", image_url: "img1.jpg" },
    ];

    // First call: saved_flyers query
    const mockOrderSaved = vi.fn().mockResolvedValue({ data: savedRows, error: null });
    const mockEqSaved = vi.fn().mockReturnValue({ order: mockOrderSaved });
    const mockSelectSaved = vi.fn().mockReturnValue({ eq: mockEqSaved });

    // Second call: flyers query
    const mockInFlyers = vi.fn().mockResolvedValue({ data: flyers, error: null });
    const mockSelectFlyers = vi.fn().mockReturnValue({ in: mockInFlyers });

    mockFrom
      .mockReturnValueOnce({ select: mockSelectSaved })
      .mockReturnValueOnce({ select: mockSelectFlyers });

    const result = await getSavedFlyers();

    // Should preserve saved order: f1 first, then f2
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("f1");
    expect(result[1].id).toBe("f2");
  });
});
