"use client";

import { useState, useCallback } from "react";

interface HeatState {
  heated: boolean;
  count: number;
  loading: boolean;
}

export function useHeat(eventId: string, initialCount: number = 0) {
  const [state, setState] = useState<HeatState>({
    heated: false,
    count: initialCount,
    loading: false,
  });

  const toggleHeat = useCallback(async () => {
    if (state.loading) return;

    // Optimistic update
    setState((prev) => ({
      ...prev,
      heated: !prev.heated,
      count: prev.heated ? prev.count - 1 : prev.count + 1,
      loading: true,
    }));

    try {
      const res = await fetch(`/api/events/${eventId}/heat`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setState({
        heated: data.heated,
        count: data.heat_count,
        loading: false,
      });
    } catch {
      // Revert optimistic update
      setState((prev) => ({
        ...prev,
        heated: !prev.heated,
        count: prev.heated ? prev.count + 1 : prev.count - 1,
        loading: false,
      }));
    }
  }, [eventId, state.loading]);

  return { ...state, toggleHeat };
}
