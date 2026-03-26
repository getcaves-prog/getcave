"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import type { LayoutFlyer } from "../types/canvas.types";

interface CanvasFlyerProps {
  flyer: LayoutFlyer;
  onImageLoad?: () => void;
}

/**
 * Detects whether the device supports hover (mouse/trackpad).
 * Touch-only devices return false — used to disable the 3D tilt effect
 * which doesn't work well with touch interactions on iOS Safari.
 */
function useHasHover(): boolean {
  const [hasHover, setHasHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHasHover(mq.matches);

    const handler = (e: MediaQueryListEvent) => setHasHover(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return hasHover;
}

export function CanvasFlyer({ flyer, onImageLoad }: CanvasFlyerProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const hasHover = useHasHover();

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    onImageLoad?.();
  }, [onImageLoad]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!hasHover) return;
      const el = cardRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Subtle tilt: max +/-4 degrees
      setTilt({
        rotateX: (0.5 - y) * 8,
        rotateY: (x - 0.5) * 8,
      });
    },
    [hasHover]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0 });
  }, []);

  const isTilted = tilt.rotateX !== 0 || tilt.rotateY !== 0;

  return (
    <div
      className="absolute select-none"
      style={{
        left: flyer.layout_x,
        top: flyer.layout_y,
        width: flyer.layout_width,
        height: flyer.layout_height,
        perspective: 600,
        WebkitPerspective: 600,
        contentVisibility: "auto",
        containIntrinsicSize: `${flyer.layout_width}px ${flyer.layout_height}px`,
      }}
    >
      <div
        ref={cardRef}
        className="relative w-full h-full overflow-hidden transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${isTilted ? 1.02 : 1})`,
          WebkitTransformStyle: "preserve-3d",
          transformStyle: "preserve-3d",
          willChange: hasHover ? "transform" : "auto",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Skeleton placeholder — visible until image loads */}
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

        {/* Subtle light reflection on hover — only on non-touch devices */}
        {hasHover && isTilted && (
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              background: `radial-gradient(circle at ${50 + tilt.rotateY * 6}% ${50 - tilt.rotateX * 6}%, white, transparent 60%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
