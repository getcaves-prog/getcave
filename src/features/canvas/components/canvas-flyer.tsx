"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import type { LayoutFlyer } from "../types/canvas.types";

const DOUBLE_TAP_DELAY = 300;

interface CanvasFlyerProps {
  flyer: LayoutFlyer;
  onDoubleTap: () => void;
}

export function CanvasFlyer({ flyer, onDoubleTap }: CanvasFlyerProps) {
  const [imageError, setImageError] = useState(false);
  const lastTapRef = useRef(0);

  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      lastTapRef.current = 0;
      onDoubleTap();
    } else {
      lastTapRef.current = now;
    }
  }, [onDoubleTap]);

  return (
    <div
      className="absolute group transition-transform duration-200 hover:z-10 hover:scale-[1.02]"
      style={{
        left: flyer.layout_x,
        top: flyer.layout_y,
        width: flyer.layout_width,
        height: flyer.layout_height,
      }}
      onClick={handleClick}
    >
      <div
        className={`
          relative w-full h-full overflow-hidden
          border transition-all duration-200
          border-cave-ash/60
          group-hover:border-cave-smoke group-hover:shadow-[0_0_10px_rgba(57,255,20,0.15)]
        `}
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
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        )}

        {/* Title overlay at the bottom */}
        {flyer.title && !imageError && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
            <p className="text-cave-white text-[10px] font-mono truncate leading-tight">
              {flyer.title}
            </p>
          </div>
        )}

        {/* Subtle worn-poster edge effect */}
        <div className="absolute inset-0 pointer-events-none border border-white/[0.02]" />
      </div>
    </div>
  );
}
