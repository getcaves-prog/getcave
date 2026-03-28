"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

  useEffect(() => {
    if (imageLoaded || imageError) return;

    timeoutRef.current = setTimeout(() => {
      if (!retried) {
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
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
      }}
    >
      {imageError ? (
        <div className="w-full h-full bg-cave-stone/50 rounded-sm" />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageSrc}
          alt={flyer.title ?? "Event flyer"}
          width={flyer.layout_width}
          height={flyer.layout_height}
          className="w-full h-full object-cover pointer-events-none"
          style={{
            opacity: imageLoaded ? 1 : 0,
            transition: "opacity 0.2s",
          }}
          draggable={false}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
}
