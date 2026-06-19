"use client";

import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { InfiniteCanvas } from "@/features/canvas/components/infinite-canvas";
import { useLocationStore } from "@/shared/stores/location.store";
import { useDiscover } from "../hooks/use-discover";
import { DiscoverHero } from "./discover-hero";
import { ScrapingIndicator } from "./scraping-indicator";

/**
 * Extracts a short city guess from the reverse-geocoded display name (e.g.
 * "Palermo, Buenos Aires, Argentina" → "Palermo"). Best-effort only.
 */
function guessCity(locationName: string | null): string {
  if (!locationName) return "";
  return locationName.split(",")[0]?.trim() ?? "";
}

export function DiscoverScreen() {
  const locationName = useLocationStore((s) => s.locationName);
  const defaultCity = useMemo(() => guessCity(locationName), [locationName]);

  const { results, loading, scraping, searched, search } = useDiscover();

  const busy = loading || scraping;
  const hasResults = results.length > 0;

  // Before the first search: a full-screen centered hero landing.
  if (!searched) {
    return (
      <main className="relative min-h-dvh w-full bg-cave-black">
        <DiscoverHero defaultCity={defaultCity} busy={busy} onSearch={search} />
      </main>
    );
  }

  // After a search: the canvas fills the viewport and the compact search bar
  // floats on top so results stay full-bleed.
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-cave-black">
      {/* Results: InfiniteCanvas renders the controlled merged list. The
          DisplayMode logic (>=8 canvas / 1-7 grid / 0 empty) applies here. */}
      <div className="absolute inset-0">
        <InfiniteCanvas
          flyers={results}
          // Keep the canvas in its loading state while the DB pass runs OR
          // while scraping is still pending with nothing to show yet — this
          // avoids flashing "Sin resultados" before scraped events arrive.
          loading={loading || (scraping && !hasResults)}
          emptyLabel="Sin resultados"
        />
      </div>

      {/* Floating compact search bar over the results. */}
      <div className="absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-cave-black via-cave-black/80 to-transparent px-4 pb-6">
        <div className="mx-auto max-w-[560px]">
          <DiscoverHero
            defaultCity={defaultCity}
            busy={busy}
            compact
            onSearch={search}
          />
        </div>
      </div>

      {/* Non-blocking scraped-pass indicator (hidden if Apify is "off"). */}
      <AnimatePresence>
        {scraping && <ScrapingIndicator />}
      </AnimatePresence>
    </main>
  );
}
