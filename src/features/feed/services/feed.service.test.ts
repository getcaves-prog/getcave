import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchNearbyEvents } from "./feed.service";
import type { GeoSearchParams, PaginationParams } from "@/shared/types/common.types";

const mockGeo: GeoSearchParams = {
  latitude: 19.4326,
  longitude: -99.1332,
  radiusMeters: 5000,
};

const mockPagination: PaginationParams = { limit: 20, offset: 0 };

const mockEvents = [
  {
    id: "evt-1",
    title: "Test Event",
    category_name: "Music",
    category_slug: "music",
    distance_meters: 1200,
    location: "POINT(-99.1332 19.4326)",
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchNearbyEvents", () => {
  it("should fetch events with correct query params", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ events: mockEvents }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchNearbyEvents(mockGeo, mockPagination);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/events?")
    );
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const params = new URLSearchParams(calledUrl.split("?")[1]);
    expect(params.get("lat")).toBe("19.4326");
    expect(params.get("lng")).toBe("-99.1332");
    expect(params.get("radius")).toBe("5000");
    expect(params.get("limit")).toBe("20");
    expect(params.get("offset")).toBe("0");
    expect(result.events).toEqual(mockEvents);
  });

  it("should include category param when provided", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ events: [] }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await fetchNearbyEvents(mockGeo, mockPagination, "music");

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const params = new URLSearchParams(calledUrl.split("?")[1]);
    expect(params.get("category")).toBe("music");
  });

  it("should not include category param when not provided", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ events: [] }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await fetchNearbyEvents(mockGeo, mockPagination);

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const params = new URLSearchParams(calledUrl.split("?")[1]);
    expect(params.has("category")).toBe(false);
  });

  it("should use default pagination when not provided", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ events: [] }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await fetchNearbyEvents(mockGeo);

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const params = new URLSearchParams(calledUrl.split("?")[1]);
    expect(params.get("limit")).toBe("20");
    expect(params.get("offset")).toBe("0");
  });

  it("should return hasMore true when events length equals limit", async () => {
    const eventsMatchingLimit = Array.from({ length: 20 }, (_, i) => ({
      id: `evt-${i}`,
    }));
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ events: eventsMatchingLimit }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchNearbyEvents(mockGeo, { limit: 20, offset: 0 });

    expect(result.hasMore).toBe(true);
  });

  it("should return hasMore false when events length is less than limit", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ events: mockEvents }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchNearbyEvents(mockGeo, { limit: 20, offset: 0 });

    expect(result.hasMore).toBe(false);
  });

  it("should return hasMore false when events array is empty", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ events: [] }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchNearbyEvents(mockGeo);

    expect(result.hasMore).toBe(false);
    expect(result.events).toEqual([]);
  });

  it("should throw error with server error message on non-ok response", async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Invalid coordinates" }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await expect(fetchNearbyEvents(mockGeo)).rejects.toThrow(
      "Invalid coordinates"
    );
  });

  it("should throw generic error when error response body is not parseable", async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockRejectedValue(new Error("parse error")),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await expect(fetchNearbyEvents(mockGeo)).rejects.toThrow(
      "Failed to fetch events"
    );
  });

  it("should propagate network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    await expect(fetchNearbyEvents(mockGeo)).rejects.toThrow("Network error");
  });
});
