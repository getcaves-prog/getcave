import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAttendance,
  setAttendance,
  clearAttendance,
} from "./attendance.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockMaybeSingle = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getAttendance ─────────────────────────────────────────────────────────
describe("getAttendance", () => {
  it("calls flyer_attendance_counts RPC with p_flyer_id", async () => {
    mockRpc.mockResolvedValue({
      data: [{ total_count: 10, solo_count: 3 }],
      error: null,
    });
    // No userId — so no from() call
    mockFrom.mockReturnValue({ select: mockSelect });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });

    const result = await getAttendance("flyer-1");

    expect(mockRpc).toHaveBeenCalledWith("flyer_attendance_counts", {
      p_flyer_id: "flyer-1",
    });
    expect(result.counts.total).toBe(10);
    expect(result.counts.solo).toBe(3);
    expect(result.mine.going).toBe(false);
    expect(result.mine.goingSolo).toBe(false);
  });

  it("returns mine.going=true when userId row exists", async () => {
    mockRpc.mockResolvedValue({
      data: [{ total_count: 5, solo_count: 1 }],
      error: null,
    });
    const ownRow = { going_solo: true };
    mockMaybeSingle.mockResolvedValue({ data: ownRow, error: null });
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getAttendance("flyer-1", "user-1");

    expect(mockFrom).toHaveBeenCalledWith("event_attendance");
    expect(result.mine.going).toBe(true);
    expect(result.mine.goingSolo).toBe(true);
  });

  it("returns mine.going=false when userId row does not exist", async () => {
    mockRpc.mockResolvedValue({
      data: [{ total_count: 0, solo_count: 0 }],
      error: null,
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getAttendance("flyer-1", "user-2");

    expect(result.mine.going).toBe(false);
    expect(result.mine.goingSolo).toBe(false);
  });

  it("returns zero counts when RPC data is empty", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await getAttendance("flyer-1");

    expect(result.counts.total).toBe(0);
    expect(result.counts.solo).toBe(0);
  });

  it("throws on RPC error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "RPC failed" },
    });

    await expect(getAttendance("flyer-1")).rejects.toThrow(
      "Failed to get attendance: RPC failed"
    );
  });
});

// ─── setAttendance ─────────────────────────────────────────────────────────
describe("setAttendance", () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });
  });

  it("upserts with going_solo=false by default", async () => {
    await setAttendance("flyer-1");

    expect(mockFrom).toHaveBeenCalledWith("event_attendance");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        flyer_id: "flyer-1",
        user_id: "user-1",
        going_solo: false,
      }),
      expect.objectContaining({ onConflict: "flyer_id,user_id" })
    );
  });

  it("upserts with going_solo=true when passed", async () => {
    await setAttendance("flyer-1", true);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ going_solo: true }),
      expect.objectContaining({ onConflict: "flyer_id,user_id" })
    );
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(setAttendance("flyer-1")).rejects.toThrow(
      "Tenés que iniciar sesión"
    );
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "RLS denied" } });

    await expect(setAttendance("flyer-1")).rejects.toThrow(
      "Failed to set attendance: RLS denied"
    );
  });
});

// ─── clearAttendance ──────────────────────────────────────────────────────
describe("clearAttendance", () => {
  const mockDeleteEq = vi.fn();

  beforeEach(() => {
    mockDeleteEq.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ eq: mockDeleteEq });
    mockFrom.mockReturnValue({ delete: mockDelete });
  });

  it("deletes the row matching the flyerId", async () => {
    await clearAttendance("flyer-1");

    expect(mockFrom).toHaveBeenCalledWith("event_attendance");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalledWith("flyer_id", "flyer-1");
  });

  it("throws on Supabase error", async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: "RLS denied" } });

    await expect(clearAttendance("flyer-1")).rejects.toThrow(
      "Failed to clear attendance: RLS denied"
    );
  });
});
