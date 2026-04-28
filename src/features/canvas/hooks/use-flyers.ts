"use client";

import { useEffect, useState } from "react";
import { getFlyers, getNearbyFlyers } from "../services/canvas.service";
import { useLocationStore } from "@/shared/stores/location.store";
import { useCanvasReadyStore } from "../stores/canvas-ready.store";
import { useCategoryFilterStore } from "../stores/category-filter.store";
import { useDisplayModeStore } from "../stores/display-mode.store";
import type { Flyer, DisplayMode } from "../types/canvas.types";

/** Minimum flyer count to use infinite canvas mode */
const CANVAS_THRESHOLD = 8;

const RADIUS_STEPS_KM = [50, 100, 200];
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveDisplayMode(count: number): DisplayMode {
  if (count === 0) return "empty";
  if (count < CANVAS_THRESHOLD) return "grid";
  return "canvas";
}

export function useFlyers() {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<DisplayMode>("empty");

  const latitude = useLocationStore((s) => s.latitude);
  const longitude = useLocationStore((s) => s.longitude);
  const locationLoading = useLocationStore((s) => s.loading);
  const selectedCategoryId = useCategoryFilterStore((s) => s.selectedCategoryId);

  useEffect(() => {
    // Wait for geolocation to resolve before fetching
    if (locationLoading) return;

    let cancelled = false;

    // Reset canvas readiness when we start a new fetch
    useCanvasReadyStore.getState().reset();

    async function fetchFlyersOnce(): Promise<Flyer[]> {
      // If category filter is active, use getFlyers with category
      if (selectedCategoryId) {
        return getFlyers(selectedCategoryId);
      }

      if (latitude !== null && longitude !== null) {
        // Try increasingly larger radii until we get enough results
        for (const radius of RADIUS_STEPS_KM) {
          const data = await getNearbyFlyers(latitude, longitude, radius);

          // If we have enough for canvas, or this is the last radius step, return whatever we have
          if (data.length >= CANVAS_THRESHOLD || radius === RADIUS_STEPS_KM[RADIUS_STEPS_KM.length - 1]) {
            return data; // Could be 0 — that's fine, shows empty state
          }
        }
        return []; // No flyers nearby at any radius
      }

      // No location available — show empty state (don't fetch all flyers globally)
      return [];
    }

    async function fetchWithRetry() {
      setLoading(true);
      setError(null);
      setMode("empty");

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
            const resolved = resolveDisplayMode(data.length);
            setFlyers(data);
            setMode(resolved);
            useDisplayModeStore.getState().setMode(resolved);
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
  }, [latitude, longitude, locationLoading, selectedCategoryId]);

  return { flyers, loading, error, mode };
}
