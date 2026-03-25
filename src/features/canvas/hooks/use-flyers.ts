"use client";

import { useEffect, useState } from "react";
import { getFlyers } from "../services/canvas.service";
import type { Flyer } from "../types/canvas.types";

export function useFlyers() {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchFlyers() {
      try {
        const data = await getFlyers();
        if (!cancelled) {
          setFlyers(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch flyers");
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
  }, []);

  return { flyers, loading, error };
}
