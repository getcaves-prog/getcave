"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { motion, useMotionValueEvent } from "framer-motion";
import { useFlyers } from "../hooks/use-flyers";
import { useCanvasGestures } from "../hooks/use-canvas-gestures";
import { CanvasFlyer } from "./canvas-flyer";
import { CANVAS_LIMITS } from "../types/canvas.types";
import type { Viewport, Flyer } from "../types/canvas.types";

const VIEWPORT_PADDING = 400;

function computeCenter(flyers: Flyer[]): { x: number; y: number } {
  if (flyers.length === 0) return { x: 0, y: 0 };

  const sumX = flyers.reduce((acc, f) => acc + f.canvas_x, 0);
  const sumY = flyers.reduce((acc, f) => acc + f.canvas_y, 0);

  return {
    x: sumX / flyers.length,
    y: sumY / flyers.length,
  };
}

function isInViewport(flyer: Flyer, viewport: Viewport): boolean {
  const flyerRight = flyer.canvas_x + flyer.width;
  const flyerBottom = flyer.canvas_y + flyer.height;

  return (
    flyerRight >= viewport.left &&
    flyer.canvas_x <= viewport.right &&
    flyerBottom >= viewport.top &&
    flyer.canvas_y <= viewport.bottom
  );
}

export function InfiniteCanvas() {
  const { flyers, loading, error } = useFlyers();
  const { springX, springY, springScale, bind, jumpTo } = useCanvasGestures();

  const [viewport, setViewport] = useState<Viewport>({
    left: -5000,
    top: -5000,
    right: 5000,
    bottom: 5000,
  });

  // Center on flyer cluster when loaded
  useEffect(() => {
    if (flyers.length === 0) return;

    const center = computeCenter(flyers);
    const windowW = window.innerWidth;
    const windowH = window.innerHeight - CANVAS_LIMITS.HEADER_HEIGHT;

    jumpTo(-center.x + windowW / 2, -center.y + windowH / 2, 0.8);
  }, [flyers, jumpTo]);

  // Update viewport bounds on transform changes
  const updateViewport = useCallback((x: number, y: number, scale: number) => {
    const windowW = typeof window !== "undefined" ? window.innerWidth : 1920;
    const windowH =
      typeof window !== "undefined"
        ? window.innerHeight - CANVAS_LIMITS.HEADER_HEIGHT
        : 1080;

    setViewport({
      left: -x / scale - VIEWPORT_PADDING,
      top: -y / scale - VIEWPORT_PADDING,
      right: (-x + windowW) / scale + VIEWPORT_PADDING,
      bottom: (-y + windowH) / scale + VIEWPORT_PADDING,
    });
  }, []);

  useMotionValueEvent(springX, "change", (x) => {
    updateViewport(x, springY.get(), springScale.get());
  });
  useMotionValueEvent(springY, "change", (y) => {
    updateViewport(springX.get(), y, springScale.get());
  });
  useMotionValueEvent(springScale, "change", (scale) => {
    updateViewport(springX.get(), springY.get(), scale);
  });

  const visibleFlyers = useMemo(
    () => flyers.filter((f) => isInViewport(f, viewport)),
    [flyers, viewport]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-cave-black text-cave-fog">
        <p className="font-mono text-sm">Error loading flyers: {error}</p>
      </div>
    );
  }

  return (
    <div
      {...bind()}
      className="w-screen overflow-hidden bg-cave-black touch-none select-none"
      style={{ height: `calc(100vh - ${CANVAS_LIMITS.HEADER_HEIGHT}px)` }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
            <p className="text-cave-fog text-sm font-mono">Loading flyers...</p>
          </div>
        </div>
      )}

      <motion.div
        className="relative origin-top-left"
        style={{
          x: springX,
          y: springY,
          scale: springScale,
          width: "1px",
          height: "1px",
        }}
      >
        {visibleFlyers.map((flyer) => (
          <CanvasFlyer key={flyer.id} flyer={flyer} />
        ))}
      </motion.div>

      <div className="grain-overlay" />
    </div>
  );
}
