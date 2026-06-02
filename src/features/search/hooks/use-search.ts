"use client";

import { useState, useCallback, useRef } from "react";
import { searchFlyers } from "../services/search.service";
import type { FlyerSearchResult } from "../services/search.service";

const DEBOUNCE_MS = 300;

export interface UseSearchReturn {
  query: string;
  setQuery: (value: string) => void;
  results: FlyerSearchResult[];
  loading: boolean;
  error: string | null;
  clear: () => void;
}

export function useSearch(): UseSearchReturn {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<FlyerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchFlyers(value);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQueryState("");
    setResults([]);
    setError(null);
    setLoading(false);
  }, []);

  return { query, setQuery, results, loading, error, clear };
}
