import { describe, it, expect, vi, beforeEach } from "vitest";
import { getForYouFlyers } from "./for-you.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockRpc = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

beforeEach(() => {
  mockRpc.mockReset();
});

// ─── getForYouFlyers ───────────────────────────────────────────────────────
describe("getForYouFlyers", () => {
  const mockFlyer = {
    id: "flyer-1",
    image_url: "https://example.com/img.jpg",
    status: "approved",
    title: "Evento punk",
    zone_name: "MTY",
    distance_m: 1500,
    distance_score: 0.85,
    time_score: 1.0,
    interaction_score: 0.3,
    interest_score: 1.0,
    total_score: 0.925,
    event_date: "2026-06-04",
    event_time: "21:00:00",
  };

  it("calls nearby_flyers_for_you RPC with correct params", async () => {
    mockRpc.mockResolvedValue({ data: [mockFlyer], error: null });

    const result = await getForYouFlyers(25.67, -100.31, 10, 50);

    expect(mockRpc).toHaveBeenCalledWith("nearby_flyers_for_you", {
      user_lat: 25.67,
      user_lng: -100.31,
      radius_km: 10,
      result_limit: 50,
    });
    expect(result).toHaveLength(1);
    expect(result[0].interest_score).toBe(1.0);
    expect(result[0].total_score).toBe(0.925);
  });

  it("returns empty array when RPC returns null data", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await getForYouFlyers(25.67, -100.31);

    expect(result).toEqual([]);
  });

  it("uses default radius (25 km) and limit (200) when not specified", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await getForYouFlyers(25.67, -100.31);

    expect(mockRpc).toHaveBeenCalledWith("nearby_flyers_for_you", {
      user_lat: 25.67,
      user_lng: -100.31,
      radius_km: 25,
      result_limit: 200,
    });
  });

  it("throws with descriptive error on RPC failure", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "PostGIS error" },
    });

    await expect(getForYouFlyers(25.67, -100.31)).rejects.toThrow(
      "Failed to fetch for-you flyers: PostGIS error"
    );
  });

  it("includes interest_score in returned ForYouFlyer shape", async () => {
    mockRpc.mockResolvedValue({
      data: [{ ...mockFlyer, interest_score: 0.0 }],
      error: null,
    });

    const result = await getForYouFlyers(25.67, -100.31);

    expect(result[0]).toHaveProperty("interest_score", 0.0);
    expect(result[0]).toHaveProperty("zone_name");
    expect(result[0]).toHaveProperty("distance_m");
  });
});
