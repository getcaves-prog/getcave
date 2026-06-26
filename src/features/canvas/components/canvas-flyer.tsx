"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { getOptimizedImageUrl } from "@/shared/lib/utils/image";
import { proxiedImageUrl } from "@/features/discover/services/image-proxy";
import { isScrapedFlyer } from "@/features/discover/types/discover.types";
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

  const scraped = isScrapedFlyer(flyer);

  // Scraped FB/IG CDN images load through our proxy; DB flyers use the
  // Supabase image-transform thumbnail (2x display size, quality 60).
  const optimizedUrl = useMemo(
    () =>
      scraped
        ? proxiedImageUrl(flyer.image_url)
        : getOptimizedImageUrl(flyer.image_url, flyer.layout_width * 2, 60),
    [scraped, flyer.image_url, flyer.layout_width],
  );

  const [imageSrc, setImageSrc] = useState(optimizedUrl);

  // Retry/fallback target: for scraped flyers the raw FB/IG URL is hotlink
  // blocked, so we must keep using the proxy on retry.
  const fallbackUrl = scraped ? proxiedImageUrl(flyer.image_url) : flyer.image_url;

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
        setImageSrc(fallbackUrl);
      } else {
        setImageError(true);
      }
    }, IMAGE_LOAD_TIMEOUT_MS);

    return clearLoadTimeout;
  }, [imageSrc, imageLoaded, imageError, retried, fallbackUrl, clearLoadTimeout]);

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
      setImageSrc(fallbackUrl);
    } else {
      setImageError(true);
    }
  }, [retried, fallbackUrl, clearLoadTimeout]);

  return (
    <div
      className={`absolute select-none pointer-events-none ${flyer.is_promoted ? "ring-1 ring-amber-500/30" : ""}`}
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

      {scraped && !imageError && (
        <span
          className="absolute left-1.5 top-1.5 rounded-sm bg-cave-black/70 px-1.5 py-0.5 text-[9px] font-[family-name:var(--font-space-mono)] uppercase tracking-wide text-cave-light backdrop-blur-sm"
          style={{ opacity: imageLoaded ? 1 : 0, transition: "opacity 0.15s" }}
        >
          vía {(flyer as LayoutFlyer & { source?: string }).source === "instagram" ? "Instagram" : "Facebook"}
        </span>
      )}
    </div>
  );
}
