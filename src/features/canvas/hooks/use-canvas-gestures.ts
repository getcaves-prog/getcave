"use client";

import { useCallback, useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import { useSpring } from "framer-motion";
import { CANVAS_LIMITS } from "../types/canvas.types";
import type { CanvasTransform } from "../types/canvas.types";

function clampScale(scale: number): number {
  return Math.min(CANVAS_LIMITS.MAX_SCALE, Math.max(CANVAS_LIMITS.MIN_SCALE, scale));
}

export function useCanvasGestures(initialTransform?: Partial<CanvasTransform>) {
  const [isDragging, setIsDragging] = useState(false);
  // True while a drag with meaningful movement is in progress or just ended.
  // Checked by click handlers to distinguish tap from pan.
  const dragOccurredRef = useRef(false);

  const transformRef = useRef<CanvasTransform>({
    x: initialTransform?.x ?? 0,
    y: initialTransform?.y ?? 0,
    scale: initialTransform?.scale ?? 1,
  });

  const springX = useSpring(transformRef.current.x, { stiffness: 400, damping: 35 });
  const springY = useSpring(transformRef.current.y, { stiffness: 400, damping: 35 });
  const springScale = useSpring(transformRef.current.scale, { stiffness: 400, damping: 35 });

  const updateTransform = useCallback(
    (updates: Partial<CanvasTransform>) => {
      if (updates.x !== undefined) {
        transformRef.current.x = updates.x;
        springX.set(updates.x);
      }
      if (updates.y !== undefined) {
        transformRef.current.y = updates.y;
        springY.set(updates.y);
      }
      if (updates.scale !== undefined) {
        const clamped = clampScale(updates.scale);
        transformRef.current.scale = clamped;
        springScale.set(clamped);
      }
    },
    [springX, springY, springScale]
  );

  const jumpTo = useCallback(
    (x: number, y: number, scale?: number) => {
      springX.jump(x);
      springY.jump(y);
      if (scale !== undefined) springScale.jump(clampScale(scale));
      transformRef.current = {
        x,
        y,
        scale: scale !== undefined ? clampScale(scale) : transformRef.current.scale,
      };
    },
    [springX, springY, springScale]
  );

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching, first, last, movement: [mx, my] }) => {
        if (pinching) return;
        if (first) setIsDragging(true);
        if (Math.abs(mx) > 6 || Math.abs(my) > 6) {
          dragOccurredRef.current = true;
        }
        if (last) {
          setIsDragging(false);
          // Reset after the click event from this pointer-up has been processed.
          // 100ms window: blocks accidental tap-after-drag, then clears for next gesture.
          setTimeout(() => { dragOccurredRef.current = false; }, 100);
        }
        updateTransform({
          x: transformRef.current.x + dx,
          y: transformRef.current.y + dy,
        });
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault();
        const { x, y, scale } = transformRef.current;
        const zoomFactor = 1 - dy * 0.0015;
        const newScale = clampScale(scale * zoomFactor);
        if (newScale === scale) return;

        // Zoom toward cursor position
        const cursorX = (event as WheelEvent).clientX;
        const cursorY = (event as WheelEvent).clientY;
        const ratio = 1 - newScale / scale;

        updateTransform({
          x: x + (cursorX - x) * ratio,
          y: y + (cursorY - y) * ratio,
          scale: newScale,
        });
      },
      onPinch: ({ offset: [scale], origin: [ox, oy] }) => {
        const prev = transformRef.current;
        const newScale = clampScale(scale);
        if (newScale === prev.scale) return;

        // Zoom toward pinch midpoint
        const ratio = 1 - newScale / prev.scale;

        updateTransform({
          x: prev.x + (ox - prev.x) * ratio,
          y: prev.y + (oy - prev.y) * ratio,
          scale: newScale,
        });
      },
    },
    {
      drag: {
        filterTaps: true,
        threshold: 3,
      },
      wheel: {
        eventOptions: { passive: false },
      },
      pinch: {
        scaleBounds: { min: CANVAS_LIMITS.MIN_SCALE, max: CANVAS_LIMITS.MAX_SCALE },
      },
    }
  );

  return {
    springX,
    springY,
    springScale,
    transformRef,
    isDragging,
    dragOccurredRef,
    bind,
    jumpTo,
  };
}
