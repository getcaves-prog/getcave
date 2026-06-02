"use client";

import { useState, useEffect, useRef } from "react";
import { getLocationByIp } from "@/shared/lib/geocoding/ip-location";

// Minimum distance (km) to trigger a location update and flyer refetch.
// At 5km we're confident the user moved to a different zone.
const REFETCH_THRESHOLD_KM = 5;

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeolocation() {
  const [state, setState] = useState({
    latitude: null as number | null,
    longitude: null as number | null,
    loading: true,
    error: null as string | null,
  });

  // Tracks last committed GPS position to detect significant moves
  const lastGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Step 1: IP geolocation — instant, no permission required.
    // Used as a fast placeholder while GPS resolves.
    getLocationByIp().then((ip) => {
      if (cancelled || !ip) return;
      if (lastGpsRef.current) return; // GPS already resolved, skip
      setState({
        latitude: ip.lat,
        longitude: ip.lng,
        loading: true, // still waiting for precise GPS
        error: null,
      });
    });

    // Step 2: Continuous GPS watch — precise, updates when user moves.
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;

          const { latitude, longitude } = pos.coords;
          const last = lastGpsRef.current;

          const isFirst = !last;
          const movedFar =
            last !== null &&
            haversineKm(last.lat, last.lng, latitude, longitude) >= REFETCH_THRESHOLD_KM;

          if (isFirst || movedFar) {
            lastGpsRef.current = { lat: latitude, lng: longitude };
            setState({ latitude, longitude, loading: false, error: null });
          } else {
            // Same area — just mark loading done on first tick
            setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
          }
        },
        () => {
          if (cancelled) return;
          // GPS denied or unavailable — keep IP location, stop loading
          setState((prev) => ({ ...prev, loading: false }));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // accept positions up to 1 min old
        }
      );
    } else {
      // No geolocation support at all
      setState((prev) => ({ ...prev, loading: false }));
    }

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    latitude: state.latitude,
    longitude: state.longitude,
    loading: state.loading,
    error: state.error,
  };
}
