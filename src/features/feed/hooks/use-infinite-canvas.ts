"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Point {
  x: number;
  y: number;
}

export function useInfiniteCanvas() {
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef<Point | null>(null);
  const positionRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

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

  return {
    position,
    isDragging,
    cursorStyle: isDragging ? "grabbing" : "grab",
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerUp,
    },
  };
}
