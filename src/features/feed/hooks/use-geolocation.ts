"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getCurrentPosition,
  DEFAULT_COORDINATES,
  type Coordinates,
} from "@/shared/lib/utils/geo";

const STORAGE_KEY = "caves_last_location";

type GeoStatus = "checking" | "prompt" | "granted" | "denied";

interface UseGeolocationReturn {
  coordinates: Coordinates | null;
  loading: boolean;
  error: string | null;
  status: GeoStatus;
  retry: () => Promise<void>;
  useDefault: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GeoStatus>("checking");

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const coords = await getCurrentPosition();
      setCoordinates(coords);
      setStatus("granted");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
    } catch (err) {
      setStatus("denied");
      setError(
        err instanceof GeolocationPositionError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Location unavailable"
      );

      // Try cached location as silent fallback
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          setCoordinates(JSON.parse(cached));
          return;
        } catch {
          // Invalid cache, fall through
        }
      }

      // No cache — coordinates stay null, show the prompt
    } finally {
      setLoading(false);
    }
  }, []);

  const useDefaultLocation = useCallback(() => {
    setCoordinates(DEFAULT_COORDINATES);
    setStatus("granted");
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    // Check permission state first to avoid unnecessary browser prompt
    if (!navigator.geolocation) {
      setStatus("denied");
      setLoading(false);
      setError("Geolocation is not supported");
      return;
    }

    // Try Permissions API for silent check
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "granted") {
            // Already granted — fetch silently
            requestLocation();
          } else if (result.state === "denied") {
            // Denied — check cache, or show prompt
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
              try {
                setCoordinates(JSON.parse(cached));
                setStatus("granted");
              } catch {
                setStatus("prompt");
              }
            } else {
              setStatus("prompt");
            }
            setLoading(false);
          } else {
            // "prompt" state — check cache first, otherwise show UI prompt
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
              try {
                setCoordinates(JSON.parse(cached));
                setStatus("granted");
                setLoading(false);
                return;
              } catch {
                // Invalid cache
              }
            }
            setStatus("prompt");
            setLoading(false);
          }
        })
        .catch(() => {
          // Permissions API not available — just request directly
          requestLocation();
        });
    } else {
      // No Permissions API — request directly
      requestLocation();
    }
  }, [requestLocation]);

  return {
    coordinates,
    loading,
    error,
    status,
    retry: requestLocation,
    useDefault: useDefaultLocation,
  };
}
