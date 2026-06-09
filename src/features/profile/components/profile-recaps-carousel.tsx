"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import type { MyRecap } from "@/features/recaps/types/recaps.types";

interface ProfileRecapsCarouselProps {
  recaps: MyRecap[];
}

// ─── MIS RECAPS — horizontal photo thumbnails + lightbox ─────────────────────
// Adapted from community-recaps-carousel. Tapping a thumb opens a lightbox.
// Hides itself when there are no recaps.
export function ProfileRecapsCarousel({ recaps }: ProfileRecapsCarouselProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (recaps.length === 0) return null;

  const active = activeIndex !== null ? recaps[activeIndex] : null;

  return (
    <section>
      <SectionHeading>Mis recaps</SectionHeading>

      <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recaps.map((recap, i) => {
          const src = recap.thumbnail_url ?? recap.media_url;
          const dateChip = recap.event_date
            ? new Date(recap.event_date + "T12:00:00").toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
              })
            : null;
          return (
            <button
              key={recap.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className="group flex-shrink-0 w-[140px] snap-start text-left active:scale-[0.98] transition-transform"
              aria-label="Ver recap"
            >
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-cave-stone border border-cave-ash/40">
                {src && (
                  <Image
                    src={src}
                    alt={recap.flyer_title ?? "Recap"}
                    fill
                    sizes="140px"
                    className="object-cover"
                    unoptimized
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-cave-black/80 via-transparent to-transparent" />
                {dateChip && (
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-cave-black/70 backdrop-blur-sm text-[9px] uppercase tracking-[0.08em] text-cave-white font-[family-name:var(--font-space-mono)]">
                    {dateChip}
                  </span>
                )}
              </div>
              {recap.flyer_title && (
                <p className="mt-2 text-xs text-cave-light font-[family-name:var(--font-inter)] leading-snug line-clamp-1">
                  {recap.flyer_title}
                </p>
              )}
              {recap.community_name && (
                <p className="mt-0.5 text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)] truncate">
                  {recap.community_name}
                </p>
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
                  alt={active.flyer_title ?? "Recap"}
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
