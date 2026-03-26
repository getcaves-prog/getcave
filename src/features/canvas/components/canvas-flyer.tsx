"use client";

import { useState } from "react";
import Image from "next/image";
import type { LayoutFlyer } from "../types/canvas.types";

interface CanvasFlyerProps {
  flyer: LayoutFlyer;
}

export function CanvasFlyer({ flyer }: CanvasFlyerProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        left: flyer.layout_x,
        top: flyer.layout_y,
        width: flyer.layout_width,
        height: flyer.layout_height,
      }}
    >
      <div
        className="relative w-full h-full overflow-hidden border border-cave-ash/60"
        style={{
          boxShadow:
            "0 2px 8px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {imageError ? (
          <div className="w-full h-full bg-cave-stone flex items-center justify-center">
            <span className="text-cave-fog text-sm font-mono text-center px-4">
              {flyer.title ?? "Event Flyer"}
            </span>
          </div>
        ) : (
          <Image
            src={flyer.image_url}
            alt={flyer.title ?? "Event flyer"}
            fill
            sizes={`${flyer.layout_width}px`}
            className="object-cover pointer-events-none"
            draggable={false}
            onError={() => setImageError(true)}
            unoptimized
          />
        )}

        {flyer.title && !imageError && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
            <p className="text-cave-white text-[10px] font-mono truncate leading-tight">
              {flyer.title}
            </p>
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none border border-white/[0.02]" />
      </div>
    </div>
  );
}
