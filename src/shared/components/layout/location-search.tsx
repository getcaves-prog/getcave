"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { autocomplete } from "@/shared/lib/geocoding/geocoding.service";
import { useLocationStore } from "@/shared/stores/location.store";
import type { GeocodingResult } from "@/shared/lib/geocoding/types";

interface LocationSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onInteraction: () => void;
}

export function LocationSearch({ isOpen, onClose, onInteraction }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const setLocation = useLocationStore((s) => s.setLocation);
  const setLocationName = useLocationStore((s) => s.setLocationName);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await autocomplete(value, 5);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleSelect = useCallback(
    (result: GeocodingResult) => {
      setLocation(result.lat, result.lng);
      setLocationName(result.displayName);
      onClose();
    },
    [setLocation, setLocationName, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — tap/click outside closes */}
          <motion.div
            className="fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Search dropdown */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 z-[65] w-[90vw] max-w-sm"
            style={{ top: 68 }}
            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={onInteraction}
            onFocus={onInteraction}
          >
            {/* Input */}
            <div className="flex items-center gap-2 rounded-t-xl border border-cave-ash bg-cave-rock px-3 h-11">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-cave-fog shrink-0"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={onInteraction}
                placeholder="Search city, neighborhood..."
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                className="flex-1 bg-transparent text-base text-cave-white placeholder:text-cave-fog/60 focus:outline-none font-[family-name:var(--font-inter)]"
              />
              {searching && (
                <div className="w-3 h-3 border border-cave-fog border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="border border-t-0 border-cave-ash bg-cave-rock rounded-b-xl overflow-hidden">
                {results.map((result, i) => (
                  <button
                    key={`${result.lat}-${result.lng}-${i}`}
                    onClick={() => handleSelect(result)}
                    className="w-full text-left px-3 py-2.5 text-sm text-cave-light hover:bg-cave-ash/50 transition-colors border-t border-cave-ash/30 first:border-t-0"
                  >
                    <span className="line-clamp-1 font-[family-name:var(--font-inter)]">
                      {result.displayName}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {query.length >= 2 && !searching && results.length === 0 && (
              <div className="border border-t-0 border-cave-ash bg-cave-rock rounded-b-xl px-3 py-3">
                <p className="text-xs text-cave-fog text-center font-[family-name:var(--font-space-mono)]">
                  No results found
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
