"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch } from "../hooks/use-search";
import type { FlyerSearchResult } from "../services/search.service";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function SearchResultRow({
  flyer,
  onSelect,
}: {
  flyer: FlyerSearchResult;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(flyer.id)}
      className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-cave-ash/50 transition-colors border-t border-cave-ash/30 first:border-t-0 min-h-[44px]"
    >
      {/* Thumbnail */}
      <div className="relative w-10 h-14 shrink-0 overflow-hidden rounded bg-cave-stone">
        <Image
          src={flyer.image_url}
          alt={flyer.title ?? "Flyer"}
          fill
          sizes="40px"
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cave-white font-[family-name:var(--font-space-mono)] line-clamp-1">
          {flyer.title ?? "Untitled"}
        </p>
        {flyer.event_date && (
          <p className="text-xs text-cave-fog font-[family-name:var(--font-inter)] mt-0.5">
            {flyer.event_date}
          </p>
        )}
        {flyer.address && (
          <p className="text-xs text-cave-fog/70 font-[family-name:var(--font-inter)] line-clamp-1 mt-0.5">
            {flyer.address}
          </p>
        )}
      </div>

      {/* Arrow */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-cave-fog shrink-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const { query, setQuery, results, loading, error, clear } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when overlay opens; clear state when it closes
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      clear();
    }
  }, [isOpen, clear]);

  const handleSelect = (id: string) => {
    onClose();
    router.push(`/flyer/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const showResults = query.trim().length > 0 && results.length > 0;
  const showEmpty =
    query.trim().length >= 2 && !loading && results.length === 0 && !error;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-cave-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Dropdown panel */}
          <motion.div
            className="fixed left-1/2 -translate-x-1/2 z-[65] w-[90vw] max-w-sm"
            style={{
              top: "max(56px, calc(env(safe-area-inset-top) + 52px))",
            }}
            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {/* Input row */}
            <div
              className={`flex items-center gap-2 px-3 h-11 border border-cave-ash bg-cave-rock ${showResults || showEmpty || error ? "rounded-t-xl" : "rounded-xl"}`}
            >
              {/* Search icon */}
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
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search flyers, events..."
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                className="flex-1 bg-transparent text-base text-cave-white placeholder:text-cave-fog/60 focus:outline-none font-[family-name:var(--font-inter)] [&::-webkit-search-cancel-button]:hidden"
                style={
                  {
                    "--focus-ring": "var(--color-neon-green)",
                  } as React.CSSProperties
                }
              />

              {/* Loading spinner */}
              {loading && (
                <div className="w-3 h-3 border border-cave-fog border-t-transparent rounded-full animate-spin shrink-0" />
              )}

              {/* Clear button — visible when there's input */}
              {query.length > 0 && !loading && (
                <button
                  onClick={clear}
                  className="flex items-center justify-center w-5 h-5 text-cave-fog hover:text-cave-white transition-colors shrink-0"
                  aria-label="Clear search"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Results list */}
            {showResults && (
              <div className="border border-t-0 border-cave-ash bg-cave-rock rounded-b-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                {results.map((flyer) => (
                  <SearchResultRow
                    key={flyer.id}
                    flyer={flyer}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {showEmpty && (
              <div className="border border-t-0 border-cave-ash bg-cave-rock rounded-b-xl px-3 py-3">
                <p className="text-xs text-cave-fog text-center font-[family-name:var(--font-space-mono)]">
                  No flyers found
                </p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="border border-t-0 border-cave-ash bg-cave-rock rounded-b-xl px-3 py-3">
                <p className="text-xs text-neon-pink text-center font-[family-name:var(--font-space-mono)]">
                  Search failed. Try again.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
