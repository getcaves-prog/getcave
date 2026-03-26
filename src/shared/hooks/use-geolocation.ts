"use client";

import { useState, useEffect, useCallback } from "react";
import { getLocationByIp } from "@/shared/lib/geocoding/ip-location";

const SESSION_KEY = "cavesapp:geolocation";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

interface StoredGeolocation {
  latitude: number;
  longitude: number;
}

function getStoredLocation(): StoredGeolocation | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "latitude" in parsed &&
      "longitude" in parsed &&
      typeof (parsed as StoredGeolocation).latitude === "number" &&
      typeof (parsed as StoredGeolocation).longitude === "number"
    ) {
      return parsed as StoredGeolocation;
    }

    return null;
  } catch {
    return null;
  }
}

function storeLocation(latitude: number, longitude: number): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ latitude, longitude }));
  } catch {
    // sessionStorage may be unavailable in some contexts
  }
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(() => {
    const stored = getStoredLocation();

    return {
      latitude: stored?.latitude ?? null,
      longitude: stored?.longitude ?? null,
      loading: !stored,
      error: null,
    };
  });

  const requestBrowserLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: prev.latitude === null
          ? "Geolocation is not supported by this browser."
          : null,
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        storeLocation(latitude, longitude);

        setState({
          latitude,
          longitude,
          loading: false,
          error: null,
        });
      },
      () => {
        // Browser geolocation failed/denied — keep IP location if we have one
        setState((prev) => ({
          ...prev,
          loading: false,
          // Only set error if we have NO location at all
          error: prev.latitude === null ? "Location unavailable" : null,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  useEffect(() => {
    const stored = getStoredLocation();

    // If we already have a stored (precise) location, skip IP lookup
    if (stored) return;

    let cancelled = false;

    async function resolveLocation() {
      // Step 1: Try IP geolocation (instant, no permission)
      const ipResult = await getLocationByIp();

      if (cancelled) return;

      if (ipResult) {
        storeLocation(ipResult.lat, ipResult.lng);
        setState({
          latitude: ipResult.lat,
          longitude: ipResult.lng,
          loading: false,
          error: null,
        });
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    }

    resolveLocation();

    return () => {
      cancelled = true;
    };
  }, [requestBrowserLocation]);

  return {
    latitude: state.latitude,
    longitude: state.longitude,
    loading: state.loading,
    error: state.error,
    requestLocation: requestBrowserLocation,
  };
}
