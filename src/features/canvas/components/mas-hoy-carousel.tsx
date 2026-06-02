"use client";

import Image from "next/image";
import type { NearbyFlyer } from "../types/canvas.types";

interface MasHoyCarouselProps {
  flyers: NearbyFlyer[];
  onFlyerSelect: (flyer: NearbyFlyer) => void;
}

/**
 * Horizontal scrollable carousel showing flyers with the same event date.
 * Only renders when there are 2 or more sibling flyers.
 */
export function MasHoyCarousel({ flyers, onFlyerSelect }: MasHoyCarouselProps) {
  if (flyers.length < 2) return null;

  return (
    <div className="mt-5">
      <p className="text-[10px] tracking-[0.2em] text-cave-fog uppercase mb-3 font-[family-name:var(--font-space-mono)] px-1">
        más hoy
      </p>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {flyers.map((flyer) => (
          <button
            key={flyer.id}
            type="button"
            onClick={() => onFlyerSelect(flyer)}
            className="relative shrink-0 w-20 h-28 rounded-lg overflow-hidden border border-cave-ash/40 hover:border-cave-fog/60 transition-colors active:scale-95"
            style={{ minHeight: 44 }}
            aria-label={flyer.title ?? "Ver flyer"}
          >
            <Image
              src={flyer.image_url}
              alt={flyer.title ?? "Event flyer"}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          </button>
        ))}
      </div>
    </div>
  );
}
