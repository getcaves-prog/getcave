"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
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
        {flyers.map((flyer) => (
          <button
            key={flyer.id}
            onClick={() =>
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
              })
            }
            className="relative aspect-[7/10] overflow-hidden bg-cave-stone"
          >
            <Image
              src={flyer.image_url}
              alt={flyer.title ?? "Flyer"}
              fill
              sizes="33vw"
              className="object-cover"
              unoptimized
            />
          </button>
        ))}
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
