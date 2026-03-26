"use client";

import { useState, useEffect, useCallback } from "react";

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

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocation is not supported by this browser.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

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
      (err) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.message,
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

    if (!stored) {
      requestLocation();
    }
  }, [requestLocation]);

  return {
    latitude: state.latitude,
    longitude: state.longitude,
    loading: state.loading,
    error: state.error,
    requestLocation,
  };
}
