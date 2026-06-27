"use client";

import { useCallback, useRef, useState } from "react";
import {
  searchFlyers,
  searchNearbyFlyers,
} from "@/features/search/services/search.service";
import { discoverEvents } from "../services/discover.client";
import type { NearbyFlyer } from "@/features/canvas/types/canvas.types";
import type { FlyerSearchResult } from "@/features/search/services/search.service";

/**
 * Maps a DB search result into the canvas `NearbyFlyer` shape. The canvas only
 * reads a subset of columns to render, so the rest are filled with safe
 * defaults. `distance_m: 0` and `zone_name: null` are synthetic (no geo).
 */
function toNearbyFlyer(r: FlyerSearchResult): NearbyFlyer {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    image_url: r.image_url,
    address: r.address,
    event_date: r.event_date,
    event_time: r.event_time,
    created_at: r.created_at,
    status: r.status,
    user_id: r.user_id,
    // Columns the canvas does not render — safe defaults.
    location: null,
    expires_at: null,
    duration_days: null,
    community_id: null,
    is_promoted: false,
    promoted_until: null,
    social_copy: null,
    canvas_x: 0,
    canvas_y: 0,
    rotation: 0,
    width: 0,
    height: 0,
    // NearbyFlyer extras
    zone_name: null,
    distance_m: 0,
  } as NearbyFlyer;
}

/**
 * Builds a normalized dedupe key from a flyer's title + event date so a scraped
 * event that already exists as a DB flyer doesn't render twice.
 */
function dedupeKey(flyer: NearbyFlyer): string {
  const title = (flyer.title ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/\s+/g, " ")
    .trim();
  const date = flyer.event_date ?? "";
  return `${title}|${date}`;
}

/** Merges two lists, dropping any flyer whose title+date key already appears. */
function mergeDedup(base: NearbyFlyer[], extra: NearbyFlyer[]): NearbyFlyer[] {
  const seen = new Set(base.map(dedupeKey));
  const merged = [...base];
  for (const flyer of extra) {
    const key = dedupeKey(flyer);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(flyer);
  }
  return merged;
}

/** Optional user coordinates for the location-aware DB pass. */
export interface DiscoverLocation {
  lat: number;
  lng: number;
}

export interface UseDiscoverResult {
  /** Current merged flyer list (DB instant + scraped second pass). */
  results: NearbyFlyer[];
  /** True while the DB search is in flight (the instant first pass). */
  loading: boolean;
  /** True while the scraped second pass is in flight. */
  scraping: boolean;
  /** True once a search has been submitted at least once. */
  searched: boolean;
  /**
   * Runs the two-pass search: DB instant, then merge scraped events.
   * When `location` is provided, the DB pass is location-aware (nearby only);
   * otherwise it falls back to a global text search.
   */
  search: (
    query: string,
    city?: string,
    location?: DiscoverLocation
  ) => Promise<void>;
}

/**
 * Orchestrates the `/descubrir` two-pass load:
 *   1. `searchFlyers` (DB) → shown immediately as NearbyFlyer[].
 *   2. `discoverEvents` (scraped FB/IG) → merged in, deduped by title+date.
 *
 * The scraped pass never blocks or replaces the DB results; if it returns `[]`
 * (e.g. Apify not configured / "off"), the DB results simply stand alone.
 */
export function useDiscover(): UseDiscoverResult {
  const [results, setResults] = useState<NearbyFlyer[]>([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [searched, setSearched] = useState(false);

  // Guards against out-of-order responses when the user searches again quickly.
  const requestIdRef = useRef(0);

  const search = useCallback(
    async (query: string, city?: string, location?: DiscoverLocation) => {
      const clean = query.trim();
      if (!clean) return;

      const requestId = ++requestIdRef.current;
      const isStale = () => requestId !== requestIdRef.current;

      setSearched(true);
      setLoading(true);
      setScraping(true);
      setResults([]);

      // Pass 1 — DB results, shown immediately. Location-aware when coordinates
      // are known (nearby only); global text search otherwise.
      let dbFlyers: NearbyFlyer[] = [];
      try {
        if (location) {
          dbFlyers = await searchNearbyFlyers(clean, location.lat, location.lng);
        } else {
          const dbResults = await searchFlyers(clean);
          dbFlyers = dbResults.map(toNearbyFlyer);
        }
      } catch {
        dbFlyers = [];
      }

      if (isStale()) return;
      setResults(dbFlyers);
      setLoading(false);

      // Pass 2 — scraped events, merged in (deduped). Never blocks pass 1.
      const scraped = await discoverEvents(clean, city);

      if (isStale()) return;
      if (scraped.length > 0) {
        setResults((prev) => mergeDedup(prev, scraped));
      }
      setScraping(false);
    },
    []
  );

  return { results, loading, scraping, searched, search };
}
