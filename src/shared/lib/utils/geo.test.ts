import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCurrentPosition,
  formatDistance,
  metersToKm,
  DEFAULT_COORDINATES,
  DEFAULT_RADIUS,
} from "@/shared/lib/utils/geo";
import type { Coordinates } from "@/shared/lib/utils/geo";

describe("DEFAULT_COORDINATES", () => {
  it("defaults to Mexico City latitude", () => {
    expect(DEFAULT_COORDINATES.latitude).toBe(19.4326);
  });

  it("defaults to Mexico City longitude", () => {
    expect(DEFAULT_COORDINATES.longitude).toBe(-99.1332);
  });
});

describe("DEFAULT_RADIUS", () => {
  it("falls back to 25000 when env var is not set", () => {
    expect(DEFAULT_RADIUS).toBe(25000);
  });
});

describe("formatDistance", () => {
  it("formats distances under 1000m in meters", () => {
    expect(formatDistance(500)).toBe("500m");
  });

  it("rounds meters to the nearest integer", () => {
    expect(formatDistance(123.7)).toBe("124m");
  });

  it("formats 0 meters", () => {
    expect(formatDistance(0)).toBe("0m");
  });

  it("formats exactly 1000m as km", () => {
    expect(formatDistance(1000)).toBe("1.0km");
  });

  it("formats distances over 1000m in km with one decimal", () => {
    expect(formatDistance(2500)).toBe("2.5km");
  });

  it("formats large distances in km", () => {
    expect(formatDistance(15750)).toBe("15.8km");
  });

  it("formats 999m in meters (boundary)", () => {
    expect(formatDistance(999)).toBe("999m");
  });

  it("formats 999.5m rounding up to 1000m but still in meters", () => {
    expect(formatDistance(999.4)).toBe("999m");
  });

  it("formats very small distances", () => {
    expect(formatDistance(1)).toBe("1m");
  });
});

describe("metersToKm", () => {
  it("converts 1000 meters to 1 km", () => {
    expect(metersToKm(1000)).toBe(1);
  });

  it("converts 0 meters to 0 km", () => {
    expect(metersToKm(0)).toBe(0);
  });

  it("converts fractional values", () => {
    expect(metersToKm(500)).toBe(0.5);
  });

  it("converts large values", () => {
    expect(metersToKm(25000)).toBe(25);
  });
});

describe("getCurrentPosition", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when geolocation is not supported", async () => {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    await expect(getCurrentPosition()).rejects.toThrow(
      "Geolocation is not supported"
    );
  });

  it("resolves with coordinates on success", async () => {
    const mockPosition = {
      coords: {
        latitude: 20.1234,
        longitude: -98.5678,
      },
    };

    const mockGetCurrentPosition = vi.fn(
      (success: PositionCallback) => {
        success(mockPosition as GeolocationPosition);
      }
    );

    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });

    const result = await getCurrentPosition();
    expect(result).toEqual({
      latitude: 20.1234,
      longitude: -98.5678,
    });
  });

  it("passes correct options to geolocation API", async () => {
    const mockGetCurrentPosition = vi.fn(
      (success: PositionCallback) => {
        success({
          coords: { latitude: 0, longitude: 0 },
        } as GeolocationPosition);
      }
    );

    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });

    await getCurrentPosition();

    expect(mockGetCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });

  it("rejects with the geolocation error on failure", async () => {
    const geoError = { code: 1, message: "User denied Geolocation" };
    const mockGetCurrentPosition = vi.fn(
      (
        _success: PositionCallback,
        error: (err: unknown) => void
      ) => {
        error(geoError);
      }
    );

    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });

    await expect(getCurrentPosition()).rejects.toBe(geoError);
  });
});
