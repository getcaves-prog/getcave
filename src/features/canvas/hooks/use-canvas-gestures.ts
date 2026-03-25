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

  const transformRef = useRef<CanvasTransform>({
    x: initialTransform?.x ?? 0,
    y: initialTransform?.y ?? 0,
    scale: initialTransform?.scale ?? 1,
  });

  const springX = useSpring(transformRef.current.x, { stiffness: 300, damping: 30 });
  const springY = useSpring(transformRef.current.y, { stiffness: 300, damping: 30 });
  const springScale = useSpring(transformRef.current.scale, { stiffness: 300, damping: 30 });

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
      onDrag: ({ delta: [dx, dy], pinching, first, last }) => {
        if (pinching) return;
        if (first) setIsDragging(true);
        if (last) setIsDragging(false);
        updateTransform({
          x: transformRef.current.x + dx,
          y: transformRef.current.y + dy,
        });
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault();
        const zoomFactor = 1 - dy * 0.001;
        const newScale = transformRef.current.scale * zoomFactor;
        updateTransform({ scale: newScale });
      },
      onPinch: ({ offset: [scale] }) => {
        updateTransform({ scale });
      },
    },
    {
      drag: {
        filterTaps: true,
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
    bind,
    jumpTo,
  };
}
