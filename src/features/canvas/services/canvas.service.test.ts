import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNearbyFlyers, getZoneName } from "./canvas.service";

const mockRpc = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

beforeEach(() => {
  mockRpc.mockReset();
});

describe("getNearbyFlyers", () => {
  it("returns NearbyFlyer array with zone_name and distance_m", async () => {
    const mockData = [
      {
        id: "1",
        image_url: "https://example.com/img.jpg",
        zone_name: "MTY",
        distance_m: 1200,
        event_date: "2026-05-10",
        event_time: "20:00:00",
        status: "approved",
      },
    ];
    mockRpc.mockResolvedValue({ data: mockData, error: null });

    const result = await getNearbyFlyers(25.67, -100.31, 5);

    expect(mockRpc).toHaveBeenCalledWith("nearby_flyers", {
      user_lat: 25.67,
      user_lng: -100.31,
      radius_km: 5,
    });
    expect(result).toHaveLength(1);
    expect(result[0].zone_name).toBe("MTY");
    expect(result[0].distance_m).toBe(1200);
    expect(result[0].event_date).toBe("2026-05-10");
  });

  it("returns empty array when RPC returns null data", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await getNearbyFlyers(25.67, -100.31, 5);
    expect(result).toEqual([]);
  });

  it("throws when RPC returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "DB error" } });
    await expect(getNearbyFlyers(25.67, -100.31, 5)).rejects.toThrow(
      "Failed to fetch nearby flyers: DB error"
    );
  });

  it("uses default radius of 25 km", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await getNearbyFlyers(25.67, -100.31);
    expect(mockRpc).toHaveBeenCalledWith("nearby_flyers", {
      user_lat: 25.67,
      user_lng: -100.31,
      radius_km: 25,
    });
  });
});

describe("getZoneName", () => {
  it("returns zone name string for a known location", async () => {
    mockRpc.mockResolvedValue({ data: "MTY", error: null });
    const result = await getZoneName(25.67, -100.31);
    expect(result).toBe("MTY");
    expect(mockRpc).toHaveBeenCalledWith("get_zone_name", {
      lat: 25.67,
      lng: -100.31,
    });
  });

  it("returns null when point is outside all zones", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await getZoneName(19.43, -99.13);
    expect(result).toBeNull();
  });

  it("returns null on RPC error without throwing", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "error" } });
    const result = await getZoneName(25.67, -100.31);
    expect(result).toBeNull();
  });
});
