"use client";

import { useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useInfiniteCanvas } from "../hooks/use-infinite-canvas";
import { CanvasFlyerItem } from "./canvas-flyer-item";
import type { PositionedEvent } from "../types/feed.types";

interface InfiniteCanvasProps {
  events: PositionedEvent[];
  isMobile: boolean;
  onFlyerTap: (eventId: string) => void;
  onFlyerDoubleTap?: (eventId: string) => void;
}

export function InfiniteCanvas({
  events,
  isMobile,
  onFlyerTap,
  onFlyerDoubleTap,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    position,
    scale,
    isDragging,
    cursorStyle,
    handlers,
    zoom,
    resetView,
  } = useInfiniteCanvas();

  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  const scaleMotion = useMotionValue(scale);

  const springX = useSpring(x, { stiffness: 500, damping: 50, mass: 1 });
  const springY = useSpring(y, { stiffness: 500, damping: 50, mass: 1 });
  const springScale = useSpring(scaleMotion, { stiffness: 300, damping: 30 });

  useEffect(() => {
    x.set(position.x);
  }, [position.x, x]);

  useEffect(() => {
    y.set(position.y);
  }, [position.y, y]);

  useEffect(() => {
    scaleMotion.set(scale);
  }, [scale, scaleMotion]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ touchAction: "none", cursor: cursorStyle }}
      {...handlers}
    >
      <motion.div
        className="absolute origin-top-left will-change-transform"
        style={{
          x: springX,
          y: springY,
          scale: springScale,
        }}
      >
        <div className="relative">
          {events.map((event, index) => (
            <CanvasFlyerItem
              key={event.id}
              event={event}
              index={index}
              isMobile={isMobile}
              onTap={onFlyerTap}
              onDoubleTap={onFlyerDoubleTap}
            />
          ))}
        </div>
      </motion.div>

      <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => zoom(scale + 0.2)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-cave-dark/90 border border-cave-rock text-cave-light hover:border-neon-green hover:text-neon-green transition-colors shadow-lg"
          aria-label="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <button
          onClick={() => zoom(scale - 0.2)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-cave-dark/90 border border-cave-rock text-cave-light hover:border-neon-green hover:text-neon-green transition-colors shadow-lg"
          aria-label="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
        <button
          onClick={resetView}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-cave-dark/90 border border-cave-rock text-cave-light hover:border-neon-green hover:text-neon-green transition-colors shadow-lg"
          aria-label="Reset view"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
