"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { listCommunityRecaps } from "@/features/recaps/services/recaps.service";
import type { EventMedia } from "@/features/recaps/types/recaps.types";

interface CommunityRecapsCarouselProps {
  communityId: string;
}

// ─── RECAPS — horizontal thumbnail carousel + simple lightbox ────────────────
// Aggregates event_media across the community's flyers. Tapping a thumbnail
// opens a lightweight full-screen lightbox. Hides itself when there are none.
export function CommunityRecapsCarousel({ communityId }: CommunityRecapsCarouselProps) {
  const prefersReducedMotion = useReducedMotion();
  const [recaps, setRecaps] = useState<EventMedia[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await listCommunityRecaps(communityId, 12);
        if (!cancelled) setRecaps(result);
      } catch {
        // Recaps are optional — hide on failure.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  if (!loaded || recaps.length === 0) return null;

  const active = activeIndex !== null ? recaps[activeIndex] : null;

  return (
    <section className="bg-cave-rock border border-cave-ash/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="border-l-2 border-cave-white/50 pl-2.5 text-[10px] uppercase tracking-[0.2em] text-cave-fog font-[family-name:var(--font-space-mono)]">
          Recaps
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto -mx-1 px-1 pb-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recaps.map((media, i) => {
          const src = media.thumbnail_url ?? media.media_url;
          return (
            <button
              key={media.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-cave-stone border border-cave-ash/40 snap-start active:scale-[0.97] transition-transform"
              aria-label="Ver recap"
            >
              {src && (
                <Image
                  src={src}
                  alt="Recap"
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[200] bg-cave-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveIndex(null)}
          >
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-cave-stone/80 border border-cave-ash/50 text-cave-white flex items-center justify-center"
              aria-label="Cerrar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <motion.div
              className="relative w-full max-w-2xl aspect-square"
              initial={prefersReducedMotion ? false : { scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={prefersReducedMotion ? undefined : { scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              {active.media_url && (
                <Image
                  src={active.media_url}
                  alt="Recap"
                  fill
                  sizes="100vw"
                  className="object-contain"
                  unoptimized
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
