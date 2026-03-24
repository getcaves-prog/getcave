import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGeolocation } from "./use-geolocation";

// jsdom does not define GeolocationPositionError — stub it globally
class GeolocationPositionErrorStub extends Error {
  code: number;
  PERMISSION_DENIED = 1;
  POSITION_UNAVAILABLE = 2;
  TIMEOUT = 3;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "GeolocationPositionError";
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).GeolocationPositionError = GeolocationPositionErrorStub;

vi.mock("@/shared/lib/utils/geo", () => ({
  getCurrentPosition: vi.fn(),
  DEFAULT_COORDINATES: { latitude: 19.4326, longitude: -99.1332 },
}));

import { getCurrentPosition } from "@/shared/lib/utils/geo";

const mockGetCurrentPosition = vi.mocked(getCurrentPosition);

const STORAGE_KEY = "caves_last_location";

function mockPermissionsAPI(state: "granted" | "denied" | "prompt") {
  Object.defineProperty(navigator, "permissions", {
    value: {
      query: vi.fn().mockResolvedValue({ state }),
    },
    writable: true,
    configurable: true,
  });
}

function mockGeolocationSupported() {
  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition: vi.fn() },
    writable: true,
    configurable: true,
  });
}

function mockGeolocationUnsupported() {
  Object.defineProperty(navigator, "geolocation", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

describe("useGeolocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGeolocationSupported();
  });

  describe("initial state", () => {
    it("should start with loading true and status checking", () => {
      mockPermissionsAPI("prompt");
      mockGetCurrentPosition.mockResolvedValue({
        latitude: 19.4326,
        longitude: -99.1332,
      });

      const { result } = renderHook(() => useGeolocation());

      expect(result.current.coordinates).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.status).toBe("checking");
      expect(result.current.error).toBeNull();
    });
  });

  describe("geolocation not supported", () => {
    it("should set denied status and error when geolocation is unavailable", async () => {
      mockGeolocationUnsupported();

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe("denied");
      expect(result.current.error).toBe("Geolocation is not supported");
      expect(result.current.coordinates).toBeNull();
    });
  });

  describe("permission granted", () => {
    it("should fetch location silently when permission is already granted", async () => {
      mockPermissionsAPI("granted");
      const coords = { latitude: 20.0, longitude: -100.0 };
      mockGetCurrentPosition.mockResolvedValueOnce(coords);

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.coordinates).toEqual(coords);
      expect(result.current.status).toBe("granted");
      expect(result.current.error).toBeNull();
      expect(mockGetCurrentPosition).toHaveBeenCalledOnce();
    });

    it("should cache coordinates in localStorage on success", async () => {
      mockPermissionsAPI("granted");
      const coords = { latitude: 20.0, longitude: -100.0 };
      mockGetCurrentPosition.mockResolvedValueOnce(coords);

      renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(coords));
      });
    });
  });

  describe("permission denied", () => {
    it("should set prompt status when denied and no cache", async () => {
      mockPermissionsAPI("denied");

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe("prompt");
      expect(result.current.coordinates).toBeNull();
    });

    it("should use cached coordinates when denied but cache exists", async () => {
      const cachedCoords = { latitude: 21.0, longitude: -101.0 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedCoords));
      mockPermissionsAPI("denied");

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.coordinates).toEqual(cachedCoords);
      expect(result.current.status).toBe("granted");
    });

    it("should set prompt status when denied and cache is invalid JSON", async () => {
      localStorage.setItem(STORAGE_KEY, "not-json");
      mockPermissionsAPI("denied");

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe("prompt");
      expect(result.current.coordinates).toBeNull();
    });
  });

  describe("permission prompt", () => {
    it("should use cached coordinates when permission is prompt and cache exists", async () => {
      const cachedCoords = { latitude: 21.0, longitude: -101.0 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedCoords));
      mockPermissionsAPI("prompt");

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.coordinates).toEqual(cachedCoords);
      expect(result.current.status).toBe("granted");
      expect(mockGetCurrentPosition).not.toHaveBeenCalled();
    });

    it("should set prompt status when no cache available", async () => {
      mockPermissionsAPI("prompt");

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe("prompt");
      expect(result.current.coordinates).toBeNull();
    });
  });

  describe("retry", () => {
    it("should request location again on retry", async () => {
      mockPermissionsAPI("prompt");

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.status).toBe("prompt");
      });

      const coords = { latitude: 22.0, longitude: -102.0 };
      mockGetCurrentPosition.mockResolvedValueOnce(coords);

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.coordinates).toEqual(coords);
      expect(result.current.status).toBe("granted");
      expect(result.current.error).toBeNull();
    });

    it("should handle retry failure with cached fallback", async () => {
      const cachedCoords = { latitude: 21.0, longitude: -101.0 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedCoords));
      mockPermissionsAPI("prompt");

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockGetCurrentPosition.mockRejectedValueOnce(
        new Error("User denied geolocation")
      );

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.status).toBe("denied");
      expect(result.current.error).toBe("User denied geolocation");
      expect(result.current.coordinates).toEqual(cachedCoords);
    });

    it("should handle retry failure without cache", async () => {
      mockPermissionsAPI("prompt");

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockGetCurrentPosition.mockRejectedValueOnce(
        new Error("User denied geolocation")
      );

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.status).toBe("denied");
      expect(result.current.error).toBe("User denied geolocation");
      expect(result.current.coordinates).toBeNull();
    });
  });

  describe("useDefault", () => {
    it("should set default coordinates when useDefault is called", async () => {
      mockPermissionsAPI("prompt");

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.status).toBe("prompt");
      });

      act(() => {
        result.current.useDefault();
      });

      expect(result.current.coordinates).toEqual({
        latitude: 19.4326,
        longitude: -99.1332,
      });
      expect(result.current.status).toBe("granted");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Permissions API unavailable", () => {
    it("should request location directly when Permissions API is not available", async () => {
      Object.defineProperty(navigator, "permissions", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const coords = { latitude: 20.0, longitude: -100.0 };
      mockGetCurrentPosition.mockResolvedValueOnce(coords);

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.coordinates).toEqual(coords);
      expect(result.current.status).toBe("granted");
      expect(mockGetCurrentPosition).toHaveBeenCalledOnce();
    });

    it("should request location directly when Permissions API query rejects", async () => {
      Object.defineProperty(navigator, "permissions", {
        value: {
          query: vi.fn().mockRejectedValue(new Error("Not supported")),
        },
        writable: true,
        configurable: true,
      });

      const coords = { latitude: 20.0, longitude: -100.0 };
      mockGetCurrentPosition.mockResolvedValueOnce(coords);

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.coordinates).toEqual(coords);
      expect(mockGetCurrentPosition).toHaveBeenCalledOnce();
    });
  });

  describe("error handling in requestLocation", () => {
    it("should handle non-Error thrown values as Location unavailable", async () => {
      mockPermissionsAPI("granted");
      mockGetCurrentPosition.mockRejectedValueOnce("unknown error");

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Location unavailable");
      expect(result.current.status).toBe("denied");
    });
  });
});
