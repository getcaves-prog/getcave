"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface DiscoverHeroProps {
  /** Initial city value (e.g. derived from the user's location). */
  defaultCity?: string;
  /** Whether a search/scrape is currently running (disables the button). */
  busy?: boolean;
  /** Compact variant: shrinks the hero once results are on screen. */
  compact?: boolean;
  /** Fired on submit (Enter or Buscar) with the trimmed query + city. */
  onSearch: (query: string, city: string) => void;
}

export function DiscoverHero({
  defaultCity = "",
  busy = false,
  compact = false,
  onSearch,
}: DiscoverHeroProps) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(defaultCity);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    onSearch(clean, city.trim());
  }

  return (
    <motion.section
      layout
      className={`flex w-full flex-col items-center ${
        compact ? "pt-6 pb-4" : "min-h-dvh justify-center px-6 py-16"
      }`}
    >
      {!compact && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="mb-8 text-center"
        >
          <h1 className="text-balance text-3xl font-[family-name:var(--font-space-mono)] uppercase tracking-tight text-cave-white sm:text-4xl">
            ¿Qué estás buscando?
          </h1>
          <p className="mx-auto mt-3 max-w-[420px] text-pretty text-sm text-cave-fog sm:text-base">
            Descubrí eventos, fiestas y movidas — desde la cueva y desde toda la
            web.
          </p>
        </motion.div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[520px] flex-col gap-3"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            inputMode="search"
            autoFocus={!compact}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="fiestas techno, arte, food trucks…"
            aria-label="Buscar eventos"
            className="h-12 flex-1 rounded-lg border border-cave-ash bg-cave-stone px-4 text-base text-cave-white placeholder:text-cave-smoke focus:border-cave-light focus:outline-none focus:ring-1 focus:ring-cave-light/60"
          />
          <button
            type="submit"
            disabled={busy || query.trim().length === 0}
            className="h-12 shrink-0 rounded-lg bg-cave-white px-6 text-sm font-medium text-cave-black transition-opacity disabled:opacity-40 sm:w-auto"
          >
            {busy ? "Buscando…" : "Buscar"}
          </button>
        </div>

        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ciudad (opcional)"
          aria-label="Ciudad"
          className="h-11 w-full rounded-lg border border-cave-rock bg-cave-dark px-4 text-sm text-cave-light placeholder:text-cave-smoke focus:border-cave-ash focus:outline-none"
        />
      </form>

      {!compact && (
        <Link
          href="/"
          className="mt-8 font-[family-name:var(--font-space-mono)] text-sm text-cave-fog underline-offset-4 transition-colors hover:text-cave-white hover:underline"
        >
          Explorar el canvas →
        </Link>
      )}
    </motion.section>
  );
}
