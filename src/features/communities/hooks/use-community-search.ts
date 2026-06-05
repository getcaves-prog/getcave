"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  searchCommunities,
  getRecommendedCommunities,
} from "../services/community-search.service";
import { listCommunities } from "../services/community.service";
import type { Community } from "../types/community.types";

// ─── useCommunitySearch ────────────────────────────────────────────────────

/**
 * Manages all data for the communities directory:
 * - Search: debounced 300ms, queries searchCommunities when query is non-empty
 * - Default view: "Para vos" (recommended) + "Populares" (all by member_count)
 *
 * City is used for the recommended ranking; userId (optional) enables
 * interest-affinity scoring.
 */
export function useCommunitySearch(opts?: { userId?: string; city?: string }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Community[]>([]);
  const [recommended, setRecommended] = useState<Community[]>([]);
  const [popular, setPopular] = useState<Community[]>([]);

  const [searchLoading, setSearchLoading] = useState(false);
  const [defaultLoading, setDefaultLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [defaultError, setDefaultError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load default view data once ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadDefault() {
      setDefaultLoading(true);
      setDefaultError(null);
      try {
        const [rec, pop] = await Promise.all([
          getRecommendedCommunities({
            userId: opts?.userId,
            city: opts?.city,
            limit: 30,
          }),
          listCommunities({ limit: 50 }),
        ]);
        if (!cancelled) {
          setRecommended(rec);
          setPopular(pop);
        }
      } catch (err) {
        if (!cancelled) {
          setDefaultError(
            err instanceof Error ? err.message : "Error al cargar comunidades"
          );
        }
      } finally {
        if (!cancelled) setDefaultLoading(false);
      }
    }

    loadDefault();
    return () => {
      cancelled = true;
    };
    // Only re-run when userId / city change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.userId, opts?.city]);

  // ── Debounced search ──────────────────────────────────────────────────
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();

    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchCommunities(trimmed, { limit: 30 });
        setSearchResults(results);
      } catch (err) {
        setSearchError(
          err instanceof Error ? err.message : "Error al buscar comunidades"
        );
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const isSearching = query.trim().length > 0;

  return {
    // query state
    query,
    setQuery: handleQueryChange,
    isSearching,

    // search mode
    searchResults,
    searchLoading,
    searchError,

    // default browse mode
    recommended,
    popular,
    defaultLoading,
    defaultError,
  };
}
