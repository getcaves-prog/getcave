"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { getOptimizedImageUrl } from "@/shared/lib/utils/image";
import type { LayoutFlyer } from "../types/canvas.types";

const IMAGE_LOAD_TIMEOUT_MS = 8_000;

interface CanvasFlyerProps {
  flyer: LayoutFlyer;
  onImageLoad?: () => void;
}

export function CanvasFlyer({ flyer, onImageLoad }: CanvasFlyerProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [retried, setRetried] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Serve optimized thumbnail — 2x the display size for retina, quality 60
  const optimizedUrl = useMemo(
    () => getOptimizedImageUrl(flyer.image_url, flyer.layout_width * 2, 60),
    [flyer.image_url, flyer.layout_width],
  );

  const [imageSrc, setImageSrc] = useState(optimizedUrl);

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
        // Retry with original URL (no transforms) as fallback
        setRetried(true);
        setImageSrc(flyer.image_url);
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

  // Handle images loaded from cache before onLoad listener attached
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && !imageLoaded) {
      handleImageLoad();
    }
  });

  const handleImageError = useCallback(() => {
    clearLoadTimeout();
    if (!retried) {
      // Fallback to original URL without transforms
      setRetried(true);
      setImageSrc(flyer.image_url);
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
          ref={imgRef}
          src={imageSrc}
          alt={flyer.title ?? "Event flyer"}
          width={flyer.layout_width}
          height={flyer.layout_height}
          className="w-full h-full object-cover pointer-events-none"
          style={{
            opacity: imageLoaded ? 1 : 0,
            transition: "opacity 0.15s",
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
