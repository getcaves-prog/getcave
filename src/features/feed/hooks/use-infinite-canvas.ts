"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface Point {
  x: number;
  y: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;

export function useInfiniteCanvas() {
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const lastPosRef = useRef<Point | null>(null);
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    
    isDraggingRef.current = true;
    setIsDragging(true);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !lastPosRef.current) return;
    
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    
    const newPos = {
      x: positionRef.current.x + dx,
      y: positionRef.current.y + dy,
    };
    
    positionRef.current = newPos;
    setPosition(newPos);
    
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    lastPosRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * delta));
    setScale(newScale);
  }, []);

  const zoom = useCallback((newScale: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    setScale(clamped);
  }, []);

  const resetView = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
  }, []);

  const cursorStyle = isDragging ? "grabbing" : "grab";

  return {
    position,
    scale,
    isDragging,
    cursorStyle,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerUp,
      onWheel: handleWheel,
    },
    zoom,
    resetView,
  };
}
