"use client";

import { useEffect, useState } from "react";
import { getCreatorAnalytics } from "@/features/analytics/services/analytics.service";
import type { CreatorAnalytics } from "@/features/analytics/types/analytics.types";

interface UseCreatorAnalyticsResult {
  data: CreatorAnalytics | null;
  loading: boolean;
  error: string | null;
}

// ─── useCreatorAnalytics ────────────────────────────────────────────────────
// Loads the current creator's flyer analytics on mount and whenever userId
// changes. No-op (idle, not loading) while userId is undefined — lets the page
// wait for auth to resolve before firing.
export function useCreatorAnalytics(
  userId?: string
): UseCreatorAnalyticsResult {
  const [data, setData] = useState<CreatorAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getCreatorAnalytics(userId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled)
          setError("No pudimos cargar tus estadísticas. Intentá de nuevo.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { data, loading, error };
}
