"use client";

import { useState } from "react";
import Image from "next/image";
import type { Flyer } from "../types/canvas.types";

interface CanvasFlyerProps {
  flyer: Flyer;
}

export function CanvasFlyer({ flyer }: CanvasFlyerProps) {
  const [selected, setSelected] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="absolute cursor-pointer group"
      style={{
        left: flyer.canvas_x,
        top: flyer.canvas_y,
        width: flyer.width,
        height: flyer.height,
        transform: `rotate(${flyer.rotation}deg)`,
      }}
      onClick={() => setSelected(!selected)}
    >
      <div
        className={`
          relative w-full h-full rounded-sm overflow-hidden
          border-2 transition-all duration-200
          ${selected ? "border-neon-green shadow-[0_0_20px_rgba(57,255,20,0.4)]" : "border-cave-ash"}
          group-hover:border-cave-smoke group-hover:shadow-[0_0_12px_rgba(57,255,20,0.2)]
        `}
        style={{
          boxShadow: selected
            ? "0 0 20px rgba(57, 255, 20, 0.4), 0 8px 32px rgba(0, 0, 0, 0.6)"
            : "0 4px 16px rgba(0, 0, 0, 0.5)",
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
            sizes="280px"
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        )}

        {/* Title overlay at the bottom */}
        {flyer.title && !imageError && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <p className="text-cave-white text-xs font-mono truncate">{flyer.title}</p>
          </div>
        )}
      </div>
    </div>
  );
}
