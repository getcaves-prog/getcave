"use client";

import { useEffect, useState } from "react";
import { getFlyers, getNearbyFlyers } from "../services/canvas.service";
import { useLocationStore } from "@/shared/stores/location.store";
import { useCanvasReadyStore } from "../stores/canvas-ready.store";
import type { Flyer } from "../types/canvas.types";

const MIN_NEARBY_RESULTS = 10;
const EXPANDED_RADIUS_KM = 200;
const DEFAULT_RADIUS_KM = 50;

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

    async function fetchFlyers() {
      setLoading(true);
      setError(null);

      try {
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

        if (!cancelled) {
          setFlyers(data);
          // Signal that flyer data is loaded
          useCanvasReadyStore.getState().setFlyersLoaded();
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch flyers"
          );
          // Even on error, mark as loaded so intro doesn't hang forever
          useCanvasReadyStore.getState().setFlyersLoaded();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchFlyers();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, locationLoading]);

  return { flyers, loading, error };
}
