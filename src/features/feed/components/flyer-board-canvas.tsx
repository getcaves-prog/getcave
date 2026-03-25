"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { useGesture } from "@use-gesture/react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { FlyerBoardItem } from "./flyer-board-item";
import type { PositionedEvent } from "../types/feed.types";

interface FlyerBoardCanvasProps {
  events: PositionedEvent[];
  scale: number;
  position: { x: number; y: number };
  onPan: (dx: number, dy: number) => void;
  onSetPosition: (x: number, y: number) => void;
  onZoom: (scale: number) => void;
  onFlyerTap: (eventId: string) => void;
  onFlyerDoubleTap?: (eventId: string) => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;

export function FlyerBoardCanvas({
  events,
  scale,
  position,
  onSetPosition,
  onZoom,
  onFlyerTap,
  onFlyerDoubleTap,
}: FlyerBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Motion values for smooth animation
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  const motionScale = useMotionValue(scale);

  // Spring wrappers for inertia
  const springX = useSpring(x, { stiffness: 200, damping: 30 });
  const springY = useSpring(y, { stiffness: 200, damping: 30 });
  const springScale = useSpring(motionScale, { stiffness: 300, damping: 30 });

  const handleFlyerTap = useCallback(
    (eventId: string) => {
      onFlyerTap(eventId);
    },
    [onFlyerTap]
  );

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], event }) => {
        event.preventDefault();
        const currentX = x.get() + dx;
        const currentY = y.get() + dy;
        x.set(currentX);
        y.set(currentY);
      },
      onDragEnd: () => {
        // Sync state with final position after drag
        onSetPosition(springX.get(), springY.get());
      },
      onPinch: ({ offset: [d], event }) => {
        event.preventDefault();
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, d));
        motionScale.set(newScale);
        onZoom(newScale);
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault();
        const currentScale = motionScale.get();
        const zoomFactor = dy > 0 ? 0.95 : 1.05;
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, currentScale * zoomFactor)
        );
        motionScale.set(newScale);
        onZoom(newScale);
      },
    },
    {
      target: containerRef,
      drag: {
        filterTaps: true,
        pointer: { touch: true },
      },
      pinch: {
        scaleBounds: { min: MIN_SCALE, max: MAX_SCALE },
        rubberband: true,
      },
      wheel: {
        eventOptions: { passive: false },
      },
    }
  );

  // Sync external state changes to motion values
  if (Math.abs(x.get() - position.x) > 1) x.set(position.x);
  if (Math.abs(y.get() - position.y) > 1) y.set(position.y);
  if (Math.abs(motionScale.get() - scale) > 0.01) motionScale.set(scale);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden touch-none"
      style={{ cursor: "grab" }}
    >
      <motion.div
        className="relative will-change-transform"
        style={{
          x: springX,
          y: springY,
          scale: springScale,
          transformOrigin: "0 0",
        }}
      >
        {events.map((event, index) => (
          <FlyerBoardItem
            key={event.id}
            event={event}
            index={index}
            onTap={handleFlyerTap}
            onDoubleTap={onFlyerDoubleTap}
          />
        ))}
      </motion.div>
    </div>
  );
}
