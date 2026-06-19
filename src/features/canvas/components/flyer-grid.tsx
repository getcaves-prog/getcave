"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import { proxiedImageUrl } from "@/features/discover/services/image-proxy";
import { isScrapedFlyer } from "@/features/discover/types/discover.types";
import { FlyerDetailModal } from "./flyer-detail-modal";
import type { Flyer, LayoutFlyer, NearbyFlyer } from "../types/canvas.types";

interface FlyerGridProps {
  flyers: Flyer[];
}

export function FlyerGrid({ flyers }: FlyerGridProps) {
  const [selected, setSelected] = useState<LayoutFlyer | null>(null);

  return (
    <div className="w-full min-h-dvh bg-cave-black pt-16 pb-8">
      <div className="grid grid-cols-3 gap-[2px] max-w-[600px] mx-auto">
        {flyers.map((flyer) => {
          const scraped = isScrapedFlyer(flyer as NearbyFlyer);
          const imageSrc = scraped
            ? proxiedImageUrl(flyer.image_url)
            : flyer.image_url;

          return (
            <button
              key={flyer.id}
              onClick={() => {
                // Scraped FB/IG events open their source URL in a new tab.
                if (scraped) {
                  const url = (flyer as { external_url?: string | null })
                    .external_url;
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                  return;
                }
                setSelected({
                  ...flyer,
                  event_date: (flyer as NearbyFlyer).event_date ?? null,
                  event_time: (flyer as NearbyFlyer).event_time ?? null,
                  zone_name: (flyer as NearbyFlyer).zone_name ?? null,
                  distance_m: (flyer as NearbyFlyer).distance_m ?? 0,
                  grid_id: flyer.id,
                  layout_x: 0,
                  layout_y: 0,
                  layout_width: 200,
                  layout_height: 286,
                  layout_rotation: 0,
                });
              }}
              className="relative aspect-[7/10] overflow-hidden bg-cave-stone"
            >
              <Image
                src={imageSrc}
                alt={flyer.title ?? "Flyer"}
                fill
                sizes="33vw"
                className="object-cover"
                unoptimized
              />
              {scraped && (
                <span className="absolute left-1.5 top-1.5 rounded-sm bg-cave-black/70 px-1.5 py-0.5 text-[9px] font-[family-name:var(--font-space-mono)] uppercase tracking-wide text-cave-light backdrop-blur-sm">
                  vía{" "}
                  {(flyer as { source?: string }).source === "instagram"
                    ? "Instagram"
                    : "Facebook"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <FlyerDetailModal
            flyer={selected}
            allFlyers={[]}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
