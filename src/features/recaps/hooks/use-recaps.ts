"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listEventMedia,
  uploadRecapMedia,
  deleteRecapMedia,
} from "../services/recaps.service";
import type { EventMedia } from "../types/recaps.types";

// ─── State / Actions shapes ────────────────────────────────────────────────

interface UseRecapsState {
  media: EventMedia[];
  loading: boolean;
  error: Error | null;
}

interface UseRecapsActions {
  upload: (file: File) => Promise<EventMedia>;
  remove: (mediaId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export type UseRecapsResult = UseRecapsState & UseRecapsActions;

// ─── useRecaps ─────────────────────────────────────────────────────────────
// Loads all event media for a flyer on mount. Exposes upload/remove/refresh.
// Validation (mime type, size) is enforced inside uploadRecapMedia service.
export function useRecaps(flyerId: string): UseRecapsResult {
  const [state, setState] = useState<UseRecapsState>({
    media: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const media = await listEventMedia(flyerId);
      setState({ media, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [flyerId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = useCallback(
    async (file: File) => {
      const media = await uploadRecapMedia(flyerId, file);
      await load();
      return media;
    },
    [flyerId, load]
  );

  const remove = useCallback(
    async (mediaId: string) => {
      await deleteRecapMedia(mediaId);
      await load();
    },
    [load]
  );

  return {
    ...state,
    upload,
    remove,
    refresh: load,
  };
}
