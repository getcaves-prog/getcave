"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FLYER_SIZES, BREAKPOINT_MOBILE } from "../constants/flyer";
import type { PositionedEvent } from "../types/feed.types";

interface CanvasFlyerItemProps {
  event: PositionedEvent;
  index: number;
  onTap: (eventId: string) => void;
  onDoubleTap?: (eventId: string) => void;
}

const STAGGER_DELAY = 0.03;
const DRAG_THRESHOLD = 5;

export function CanvasFlyerItem({ event, index, onTap, onDoubleTap }: CanvasFlyerItemProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const lastTapRef = useRef(0);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < BREAKPOINT_MOBILE);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only handle if it's a direct touch on the flyer
    if (e.target !== containerRef.current && !(e.target as HTMLElement).closest('[data-flyer-content]')) {
      return;
    }
    
    startPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    
    // Prevent default to stop text selection
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPosRef.current) return;
    
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      isDraggingRef.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!startPosRef.current) return;
    
    // If was dragging, don't trigger tap
    if (isDraggingRef.current) {
      startPosRef.current = null;
      isDraggingRef.current = false;
      return;
    }
    
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < 300 && onDoubleTap) {
        onDoubleTap(event.id);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        onTap(event.id);
      }
    }
    
    startPosRef.current = null;
    isDraggingRef.current = false;
  };

  const baseScale = event.scale ?? 1;

  return (
    <motion.div
      ref={containerRef}
      className="absolute"
      style={{
        left: event.x,
        top: event.y,
        rotate: event.rotation,
        zIndex: isHovered ? 10 : 1,
        touchAction: "none",
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: baseScale, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * STAGGER_DELAY,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        startPosRef.current = null;
        isDraggingRef.current = false;
      }}
    >
      <div
        className="relative overflow-hidden rounded-lg flyer-card"
        data-flyer-content
        style={{
          width: isMobile ? `${FLYER_SIZES.mobile.width}px` : `${FLYER_SIZES.desktop.width}px`,
          height: isMobile ? `${FLYER_SIZES.mobile.height}px` : `${FLYER_SIZES.desktop.height}px`,
          aspectRatio: "2/3",
          cursor: "pointer",
        }}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          className="relative h-full w-full overflow-hidden rounded-lg border transition-all duration-300"
          animate={{
            scale: isHovered && !isMobile ? 1.05 : 1,
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
            className="object-cover pointer-events-none"
            sizes={isMobile ? `${FLYER_SIZES.mobile.width}px` : `${FLYER_SIZES.desktop.width}px`}
            priority={index < 12}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

          {/* Bottom info */}
          <div className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-8 pointer-events-none">
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
              className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm pointer-events-none"
              style={{
                backgroundColor: "rgba(255, 107, 43, 0.9)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              <span>🔥</span>
              <span>{event.heat_count}</span>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
