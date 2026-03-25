"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useInfiniteCanvas } from "../hooks/use-infinite-canvas";
import { CanvasFlyerItem } from "./canvas-flyer-item";
import type { PositionedEvent } from "../types/feed.types";

interface InfiniteCanvasProps {
  events: PositionedEvent[];
  onFlyerTap: (eventId: string) => void;
  onFlyerDoubleTap?: (eventId: string) => void;
}

export function InfiniteCanvas({
  events,
  onFlyerTap,
  onFlyerDoubleTap,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showHandCursor, setShowHandCursor] = useState(false);
  
  const {
    position,
    scale,
    isDragging,
    isSpacePressed,
    handlers,
    zoom,
    resetView,
    setPosition,
  } = useInfiniteCanvas();

  // Motion values for smooth animation
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  const scaleMotion = useMotionValue(scale);

  // Spring wrappers for smooth transitions
  const springX = useSpring(x, { stiffness: 500, damping: 50, mass: 1 });
  const springY = useSpring(y, { stiffness: 500, damping: 50, mass: 1 });
  const springScale = useSpring(scaleMotion, { stiffness: 300, damping: 30 });

  // Sync motion values with state
  useEffect(() => {
    x.set(position.x);
  }, [position.x, x]);

  useEffect(() => {
    y.set(position.y);
  }, [position.y, y]);

  useEffect(() => {
    scaleMotion.set(scale);
  }, [scale, scaleMotion]);

  // Show hand cursor hint after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHandCursor(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Calculate cursor style
  const cursorStyle = useMemo(() => {
    if (isDragging) return "grabbing";
    if (isSpacePressed) return "grab";
    return "default";
  }, [isDragging, isSpacePressed]);

  // Center position for zoom buttons
  const getCenterPoint = () => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  };

  // Calculate grid size based on scale
  const gridSize = 100 * scale;
  const gridOffsetX = position.x % gridSize;
  const gridOffsetY = position.y % gridSize;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-cave-dark"
      style={{ touchAction: "none" }}
    >
      {/* Canvas container - captures all pointer events */}
      <div
        className="absolute inset-0"
        style={{
          cursor: cursorStyle,
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        {...handlers}
      >
        {/* Transform layer */}
        <motion.div
          className="absolute origin-top-left will-change-transform"
          style={{
            x: springX,
            y: springY,
            scale: springScale,
          }}
        >
          {/* Events layer */}
          <div className="relative">
            {events.map((event, index) => (
              <CanvasFlyerItem
                key={event.id}
                event={event}
                index={index}
                onTap={onFlyerTap}
                onDoubleTap={onFlyerDoubleTap}
              />
            ))}
          </div>
        </motion.div>

        {/* Grid pattern for depth perception */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(57, 255, 20, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(57, 255, 20, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
          }}
        />
      </div>

      {/* Hand cursor hint */}
      {showHandCursor && !isDragging && (
        <motion.div 
          className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 text-cave-fog/50 text-xs font-[family-name:var(--font-space-mono)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            <span className="hidden sm:inline">Presiona ESPACIO + arrastra para mover</span>
            <span className="sm:hidden">Arrastra para mover</span>
          </div>
        </motion.div>
      )}

      {/* Zoom and controls overlay */}
      <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => {
            const center = getCenterPoint();
            zoom(scale + 0.2, center);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-cave-dark/90 border border-cave-rock text-cave-light hover:border-neon-green hover:text-neon-green transition-colors shadow-lg"
          aria-label="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <button
          onClick={() => {
            const center = getCenterPoint();
            zoom(scale - 0.2, center);
          }}
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

      {/* Info overlay */}
      <div className="absolute bottom-24 left-4 z-20 pointer-events-none">
        <div className="flex flex-col gap-1 text-[10px] text-cave-fog/60 font-[family-name:var(--font-space-mono)]">
          <span>Zoom: {Math.round(scale * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
