"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import type { LayoutFlyer } from "../types/canvas.types";

interface CanvasFlyerProps {
  flyer: LayoutFlyer;
}

export function CanvasFlyer({ flyer }: CanvasFlyerProps) {
  const [imageError, setImageError] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Subtle tilt: max ±4 degrees
    setTilt({
      rotateX: (0.5 - y) * 8,
      rotateY: (x - 0.5) * 8,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0 });
  }, []);

  return (
    <div
      className="absolute select-none"
      style={{
        left: flyer.layout_x,
        top: flyer.layout_y,
        width: flyer.layout_width,
        height: flyer.layout_height,
        perspective: 600,
      }}
    >
      <div
        ref={cardRef}
        className="relative w-full h-full overflow-hidden transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.rotateX || tilt.rotateY ? 1.02 : 1})`,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
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

        {/* Subtle light reflection on hover */}
        {(tilt.rotateX !== 0 || tilt.rotateY !== 0) && (
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
