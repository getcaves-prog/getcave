"use client";

import { useState, useEffect, useCallback } from "react";
import { listMyRecaps } from "@/features/recaps/services/recaps.service";
import type { MyRecap } from "@/features/recaps/types/recaps.types";

// ─── State shape ───────────────────────────────────────────────────────────

interface UseMyRecapsState {
  recaps: MyRecap[];
  loading: boolean;
  error: Error | null;
}

// ─── useMyRecaps ───────────────────────────────────────────────────────────
// Loads event_media items from events the current (or given) user attended.
// No-op when userId is undefined (e.g. auth not resolved yet).
// Mirrors the pattern established by useMyActivity.
export function useMyRecaps(userId: string | undefined): UseMyRecapsState {
  const [state, setState] = useState<UseMyRecapsState>({
    recaps: [],
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!userId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const recaps = await listMyRecaps(userId);
      setState({ recaps, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return state;
}
