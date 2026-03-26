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
      <div className="relative w-full h-full overflow-hidden">
        {imageError ? (
          <div className="w-full h-full bg-cave-stone" />
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
      </div>
    </div>
  );
}
