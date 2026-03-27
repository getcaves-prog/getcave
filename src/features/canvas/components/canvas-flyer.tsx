"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import type { LayoutFlyer } from "../types/canvas.types";

const IMAGE_LOAD_TIMEOUT_MS = 5_000;

interface CanvasFlyerProps {
  flyer: LayoutFlyer;
  onImageLoad?: () => void;
}

export function CanvasFlyer({ flyer, onImageLoad }: CanvasFlyerProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [retried, setRetried] = useState(false);
  const [imageSrc, setImageSrc] = useState(flyer.image_url);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Start a load timeout whenever src changes and image hasn't loaded yet
  useEffect(() => {
    if (imageLoaded || imageError) return;

    timeoutRef.current = setTimeout(() => {
      if (!retried) {
        // Retry once with cache-busting param
        setRetried(true);
        setImageSrc(`${flyer.image_url}?t=${Date.now()}`);
      } else {
        setImageError(true);
      }
    }, IMAGE_LOAD_TIMEOUT_MS);

    return clearLoadTimeout;
  }, [imageSrc, imageLoaded, imageError, retried, flyer.image_url, clearLoadTimeout]);

  const handleImageLoad = useCallback(() => {
    clearLoadTimeout();
    setImageLoaded(true);
    onImageLoad?.();
  }, [onImageLoad, clearLoadTimeout]);

  const handleImageError = useCallback(() => {
    clearLoadTimeout();
    if (!retried) {
      // Retry once with cache-busting param
      setRetried(true);
      setImageSrc(`${flyer.image_url}?t=${Date.now()}`);
    } else {
      setImageError(true);
    }
  }, [retried, flyer.image_url, clearLoadTimeout]);

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
          <div className="absolute inset-0 bg-cave-stone/30" />
        )}

        {imageError ? (
          <div className="w-full h-full bg-cave-stone" />
        ) : (
          <Image
            src={imageSrc}
            alt={flyer.title ?? "Event flyer"}
            fill
            sizes={`${flyer.layout_width}px`}
            className={`object-cover pointer-events-none transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            draggable={false}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="eager"
            unoptimized
          />
        )}
      </div>
    </div>
  );
}
