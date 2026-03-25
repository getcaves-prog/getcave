"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FLYER_SIZES, BREAKPOINT_MOBILE } from "../constants/flyer";
import type { PositionedEvent } from "../types/feed.types";

interface FlyerBoardItemProps {
  event: PositionedEvent;
  index: number;
  onTap: (eventId: string) => void;
  onDoubleTap?: (eventId: string) => void;
}

const STAGGER_DELAY = 0.03;

export function FlyerBoardItem({ event, index, onTap, onDoubleTap }: FlyerBoardItemProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const lastTapRef = useRef(0);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Detect mobile on mount
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < BREAKPOINT_MOBILE);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Handle pointer down - record start position
  const handlePointerDown = (e: React.PointerEvent) => {
    startPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Handle pointer up - detect tap vs drag
  const handlePointerUp = (e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    
    // Only trigger tap if movement was minimal (< 10px)
    if (dx < 10 && dy < 10) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < 300) {
        // Double tap
        onDoubleTap?.(event.id);
        lastTapRef.current = 0; // Reset to prevent triple tap
      } else {
        // Single tap
        lastTapRef.current = now;
        onTap(event.id);
      }
    }
  };

  const baseScale = event.scale ?? 1;

  return (
    <motion.div
      className="absolute"
      style={{
        left: event.x,
        top: event.y,
        rotate: event.rotation,
        zIndex: isHovered ? 10 : 1,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: baseScale, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * STAGGER_DELAY,
      }}
    >
      <div
        className="relative overflow-hidden rounded-lg transition-transform duration-200"
        style={{
          width: isMobile ? FLYER_SIZES.mobile.width : FLYER_SIZES.desktop.width,
          height: isMobile ? FLYER_SIZES.mobile.height : FLYER_SIZES.desktop.height,
          transform: isHovered && !isMobile ? "scale(1.05)" : "scale(1)",
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Card container with border and shadow */}
        <div
          className="relative h-full w-full overflow-hidden rounded-lg border transition-all duration-300"
          style={{
            borderColor: isHovered && !isMobile
              ? "rgba(57, 255, 20, 0.4)"
              : "rgba(42, 42, 42, 0.6)",
            boxShadow: isHovered && !isMobile
              ? "0 0 30px rgba(57, 255, 20, 0.2), 0 10px 40px rgba(0, 0, 0, 0.6)"
              : "0 4px 20px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Flyer image */}
          <Image
            src={event.flyer_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes={isMobile ? `${FLYER_SIZES.mobile.width}px` : `${FLYER_SIZES.desktop.width}px`}
            priority={index < 12}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {/* Bottom info */}
          <div className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-8">
            <p className="truncate text-xs font-medium text-white/95 font-[family-name:var(--font-space-mono)]">
              {event.title}
            </p>
            {event.date && (
              <p className="truncate text-[10px] text-white/60 mt-0.5">
                {new Date(event.date).toLocaleDateString("es-MX", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>

          {/* Heat count badge */}
          {event.heat_count != null && event.heat_count > 0 && (
            <div
              className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm"
              style={{
                backgroundColor: "rgba(255, 107, 43, 0.9)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              <span>🔥</span>
              <span>{event.heat_count}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
