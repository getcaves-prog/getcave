"use client";

import { useEffect, useState } from "react";
import { getFlyers, getNearbyFlyers, getNearbyFlyersScored } from "../services/canvas.service";
import { useLocationStore } from "@/shared/stores/location.store";
import { useCanvasReadyStore } from "../stores/canvas-ready.store";
import { useCategoryFilterStore } from "../stores/category-filter.store";
import { useDisplayModeStore } from "../stores/display-mode.store";
import type { NearbyFlyer, DisplayMode } from "../types/canvas.types";

const SCORED_FEED_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_SCORED_FEED === "true";

/** Minimum flyer count to use infinite canvas mode */
const CANVAS_THRESHOLD = 8;

/** Per-step minimum to advance to the next radius (spec: 10 at 5km, 20 at 10km) */
const RADIUS_STEP_THRESHOLDS = [10, 20];
const RADIUS_STEPS_KM = [5, 10, 25];
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
  const [flyers, setFlyers] = useState<NearbyFlyer[]>([]);
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

    async function fetchFlyersOnce(): Promise<NearbyFlyer[]> {
      // If category filter is active, use getFlyers with category
      if (selectedCategoryId) {
        return getFlyers(selectedCategoryId) as Promise<NearbyFlyer[]>;
      }

      if (latitude !== null && longitude !== null) {
        // Scored feed: single RPC call, ordered by weighted score
        if (SCORED_FEED_ENABLED) {
          return getNearbyFlyersScored(latitude, longitude, 25);
        }

        // Default: expand radius until we hit the step threshold or exhaust all steps
        for (let i = 0; i < RADIUS_STEPS_KM.length; i++) {
          const radius = RADIUS_STEPS_KM[i];
          const data = await getNearbyFlyers(latitude, longitude, radius);
          const isLastStep = i === RADIUS_STEPS_KM.length - 1;
          const stepThreshold = RADIUS_STEP_THRESHOLDS[i];

          // Last step: always return what we have
          if (isLastStep) return data;

          // Has enough for this step's threshold — stop expanding
          if (data.length >= stepThreshold) return data;
        }
      }

      // No location available — show empty state
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
