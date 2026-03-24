import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEventById, incrementViewCount } from "./events.service";

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockRpc = vi.fn();

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
      rpc: mockRpc,
    })
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle });
});

describe("getEventById", () => {
  const mockEventDetail = {
    id: "evt-1",
    title: "Test Event",
    description: "A test event",
    categories: { name: "Music", slug: "music", icon: "🎵" },
    profiles: { username: "testuser", avatar_url: null },
  };

  it("should query the events table with the correct id", async () => {
    mockSingle.mockResolvedValue({ data: mockEventDetail, error: null });

    await getEventById("evt-1");

    expect(mockFrom).toHaveBeenCalledWith("events");
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("categories")
    );
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("profiles")
    );
    expect(mockEq).toHaveBeenCalledWith("id", "evt-1");
  });

  it("should return event detail on success", async () => {
    mockSingle.mockResolvedValue({ data: mockEventDetail, error: null });

    const result = await getEventById("evt-1");

    expect(result).toEqual(mockEventDetail);
  });

  it("should return null when event is not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const result = await getEventById("non-existent");

    expect(result).toBeNull();
  });

  it("should return null on database error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    const result = await getEventById("evt-1");

    expect(result).toBeNull();
  });

  it("should return null when error exists even if data is returned", async () => {
    mockSingle.mockResolvedValue({
      data: mockEventDetail,
      error: { message: "Partial error" },
    });

    const result = await getEventById("evt-1");

    expect(result).toBeNull();
  });
});

describe("incrementViewCount", () => {
  it("should call rpc with correct function name and event_id", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await incrementViewCount("evt-1");

    expect(mockRpc).toHaveBeenCalledWith("increment_view_count", {
      event_id: "evt-1",
    });
  });

  it("should not throw on rpc error (fire and forget)", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "RPC failed" },
    });

    await expect(incrementViewCount("evt-1")).resolves.toBeUndefined();
  });
});
