"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { LayoutFlyer } from "../types/canvas.types";

interface CanvasFlyerProps {
  flyer: LayoutFlyer;
  onImageLoad?: () => void;
}

export function CanvasFlyer({ flyer, onImageLoad }: CanvasFlyerProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    onImageLoad?.();
  }, [onImageLoad]);

  return (
    <div
      className="absolute select-none pointer-events-none"
      style={{
        left: flyer.layout_x,
        top: flyer.layout_y,
        width: flyer.layout_width,
        height: flyer.layout_height,
        contentVisibility: "auto",
        containIntrinsicSize: `${flyer.layout_width}px ${flyer.layout_height}px`,
      }}
    >
      <div className="relative w-full h-full overflow-hidden">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-cave-black animate-pulse" />
        )}

        {imageError ? (
          <div className="w-full h-full bg-cave-stone" />
        ) : (
          <Image
            src={flyer.image_url}
            alt={flyer.title ?? "Event flyer"}
            fill
            sizes={`${flyer.layout_width}px`}
            className={`object-cover pointer-events-none transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            draggable={false}
            onError={() => setImageError(true)}
            onLoad={handleImageLoad}
            loading="lazy"
            unoptimized
          />
        )}
      </div>
    </div>
  );
}
