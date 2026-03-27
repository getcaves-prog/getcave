"use client";

import { useEffect, useState } from "react";
import { getFlyers, getNearbyFlyers } from "../services/canvas.service";
import { useLocationStore } from "@/shared/stores/location.store";
import { useCanvasReadyStore } from "../stores/canvas-ready.store";
import type { Flyer } from "../types/canvas.types";

const MIN_NEARBY_RESULTS = 10;
const EXPANDED_RADIUS_KM = 200;
const DEFAULT_RADIUS_KM = 50;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useFlyers() {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const latitude = useLocationStore((s) => s.latitude);
  const longitude = useLocationStore((s) => s.longitude);
  const locationLoading = useLocationStore((s) => s.loading);

  useEffect(() => {
    // Wait for geolocation to resolve before fetching
    if (locationLoading) return;

    let cancelled = false;

    // Reset canvas readiness when we start a new fetch
    useCanvasReadyStore.getState().reset();

    async function fetchFlyersOnce(): Promise<Flyer[]> {
      let data: Flyer[];

      if (latitude !== null && longitude !== null) {
        // Try nearby with default radius first
        data = await getNearbyFlyers(latitude, longitude, DEFAULT_RADIUS_KM);

        // If too few results, expand radius to cover all of Nuevo Leon
        if (data.length < MIN_NEARBY_RESULTS) {
          data = await getNearbyFlyers(
            latitude,
            longitude,
            EXPANDED_RADIUS_KM
          );
        }

        // If still no results, fallback to all flyers
        if (data.length === 0) {
          data = await getFlyers();
        }
      } else {
        // No location available — fetch all flyers
        data = await getFlyers();
      }

      return data;
    }

    async function fetchWithRetry() {
      setLoading(true);
      setError(null);

      let lastError: unknown = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (cancelled) return;

        try {
          if (attempt > 0) {
            await delay(RETRY_DELAY_MS);
            if (cancelled) return;
          }

          const data = await fetchFlyersOnce();

          if (!cancelled) {
            if (data.length === 0) {
              setError("No flyers available at this time. Pull down to retry.");
            } else {
              setFlyers(data);
            }
            useCanvasReadyStore.getState().setFlyersLoaded();
            return;
          }
        } catch (err) {
          lastError = err;
        }
      }

      // All retries exhausted
      if (!cancelled) {
        setError(
          lastError instanceof Error
            ? lastError.message
            : "Failed to fetch flyers after multiple attempts"
        );
        useCanvasReadyStore.getState().setFlyersLoaded();
      }
    }

    fetchWithRetry().finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, locationLoading]);

  return { flyers, loading, error };
}
