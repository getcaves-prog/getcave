"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
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

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;

export function FlyerBoardCanvas({
  events,
  scale,
  position,
  onPan,
  onSetPosition,
  onZoom,
  onFlyerTap,
  onFlyerDoubleTap,
}: FlyerBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  // Motion values for smooth animation
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  const motionScale = useMotionValue(scale);

  // Spring wrappers for inertia
  const springX = useSpring(x, { stiffness: 200, damping: 30, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 200, damping: 30, mass: 0.5 });
  const springScale = useSpring(motionScale, { stiffness: 300, damping: 30 });

  // Sync external state changes to motion values
  useEffect(() => {
    x.set(position.x);
    y.set(position.y);
  }, [position.x, position.y, x, y]);

  useEffect(() => {
    motionScale.set(scale);
  }, [scale, motionScale]);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only left click / touch
    
    isDraggingRef.current = true;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    lastPos.current = { x: e.clientX, y: e.clientY };
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    
    const newX = x.get() + dx;
    const newY = y.get() + dy;
    
    x.set(newX);
    y.set(newY);
    
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [x, y]);

  // Handle pointer up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    setIsDragging(false);
    
    // Calculate if it was a tap or drag
    const totalDx = Math.abs(e.clientX - startPos.current.x);
    const totalDy = Math.abs(e.clientY - startPos.current.y);
    const wasDragging = totalDx > 10 || totalDy > 10;
    
    if (wasDragging) {
      // Sync state after drag
      onSetPosition(x.get(), y.get());
    }
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [x, y, onSetPosition]);

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const currentScale = motionScale.get();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale * zoomFactor));
    
    motionScale.set(newScale);
    onZoom(newScale);
  }, [motionScale, onZoom]);

  // Handle double tap for zoom reset
  const lastTapTime = useRef(0);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      // Double tap - reset zoom
      motionScale.set(1);
      onZoom(1);
    }
    lastTapTime.current = now;
  }, [motionScale, onZoom]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      style={{ 
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        className="relative"
        style={{
          x: springX,
          y: springY,
          scale: springScale,
          transformOrigin: "50% 50%",
        }}
      >
        {events.map((event, index) => (
          <FlyerBoardItem
            key={event.id}
            event={event}
            index={index}
            onTap={onFlyerTap}
            onDoubleTap={onFlyerDoubleTap}
          />
        ))}
      </motion.div>
    </div>
  );
}
