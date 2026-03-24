"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNearbyEvents } from "../services/feed.service";
import { DEFAULT_RADIUS } from "@/shared/lib/utils/geo";
import type { Coordinates } from "@/shared/lib/utils/geo";
import type { FeedEvent } from "../types/feed.types";

const FEED_LIMIT = 20;

interface UseFeedReturn {
  events: FeedEvent[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  retry: () => void;
}

export function useFeed(
  coordinates: Coordinates | null,
  categorySlug?: string
): UseFeedReturn {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);

  const fetchEvents = useCallback(
    async (reset = false) => {
      if (!coordinates) return;
      if (loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const offset = reset ? 0 : offsetRef.current;

      try {
        const result = await fetchNearbyEvents(
          {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            radiusMeters: DEFAULT_RADIUS,
          },
          { limit: FEED_LIMIT, offset },
          categorySlug
        );

        if (reset) {
          setEvents(result.events);
          setCurrentIndex(0);
        } else {
          setEvents((prev) => [...prev, ...result.events]);
        }

        setHasMore(result.hasMore);
        offsetRef.current = offset + result.events.length;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load events"
        );
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [coordinates, categorySlug]
  );

  useEffect(() => {
    if (coordinates) {
      offsetRef.current = 0;
      fetchEvents(true);
    }
  }, [coordinates, categorySlug, fetchEvents]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current) return;
    await fetchEvents(false);
  }, [hasMore, fetchEvents]);

  const retry = useCallback(() => {
    offsetRef.current = 0;
    fetchEvents(true);
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    hasMore,
    loadMore,
    currentIndex,
    setCurrentIndex,
    retry,
  };
}
