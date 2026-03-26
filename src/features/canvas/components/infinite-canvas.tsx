"use client";

import { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { motion, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useFlyers } from "../hooks/use-flyers";
import { useCanvasGestures } from "../hooks/use-canvas-gestures";
import { CanvasFlyer } from "./canvas-flyer";
import { FlyerDetailModal } from "./flyer-detail-modal";
import {
  CANVAS_LIMITS,
  GRID_CONFIG,
  MOBILE_BREAKPOINT,
} from "../types/canvas.types";
import type {
  Viewport,
  Flyer,
  LayoutFlyer,
  GridConfig,
} from "../types/canvas.types";

const VIEWPORT_PADDING = 600;
const DOUBLE_TAP_DELAY = 300;

function getGridConfig(): GridConfig {
  if (typeof window === "undefined") return GRID_CONFIG.desktop;
  return window.innerWidth < MOBILE_BREAKPOINT
    ? GRID_CONFIG.mobile
    : GRID_CONFIG.desktop;
}

/**
 * Generates flyers that tile infinitely in all directions.
 * Uses modulo to repeat the source flyers across an infinite grid.
 * Only generates flyers visible in the current viewport.
 */
function generateVisibleFlyers(
  sourceFlyers: Flyer[],
  viewport: Viewport,
  config: GridConfig
): LayoutFlyer[] {
  if (sourceFlyers.length === 0) return [];

  const { flyerWidth, flyerHeight, gap } = config;
  const cellW = flyerWidth + gap;
  const cellH = flyerHeight + gap;

  // Determine which grid cells are visible
  const colStart = Math.floor(viewport.left / cellW) - 1;
  const colEnd = Math.ceil(viewport.right / cellW) + 1;
  const rowStart = Math.floor(viewport.top / cellH) - 1;
  const rowEnd = Math.ceil(viewport.bottom / cellH) + 1;

  const result: LayoutFlyer[] = [];
  const sourceCount = sourceFlyers.length;

  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      // Use a deterministic index based on grid position
      // Modulo to cycle through source flyers
      const rawIndex = ((row * 7919 + col * 104729) % sourceCount + sourceCount) % sourceCount;
      const flyer = sourceFlyers[rawIndex];

      result.push({
        ...flyer,
        id: `${col},${row}`,
        layout_x: col * cellW,
        layout_y: row * cellH,
        layout_width: flyerWidth,
        layout_height: flyerHeight,
        layout_rotation: 0,
      });
    }
  }

  return result;
}

export function InfiniteCanvas() {
  const { flyers, loading, error } = useFlyers();
  const { springX, springY, springScale, isDragging, bind, jumpTo, transformRef } = useCanvasGestures();

  const [gridConfig, setGridConfig] = useState<GridConfig>(getGridConfig);
  const [selectedFlyer, setSelectedFlyer] = useState<LayoutFlyer | null>(null);
  const lastTapRef = useRef(0);
  const initializedRef = useRef(false);

  const [viewport, setViewport] = useState<Viewport>({
    left: -2000,
    top: -2000,
    right: 2000,
    bottom: 2000,
  });

  useEffect(() => {
    function handleResize() {
      setGridConfig(getGridConfig());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Center on (0,0) when first loaded
  useEffect(() => {
    if (flyers.length === 0 || initializedRef.current) return;
    initializedRef.current = true;

    const windowW = window.innerWidth;
    jumpTo(windowW / 2, window.innerHeight / 2, 1);
  }, [flyers, jumpTo]);

  const updateViewport = useCallback((x: number, y: number, scale: number) => {
    const windowW = typeof window !== "undefined" ? window.innerWidth : 1920;
    const windowH = typeof window !== "undefined" ? window.innerHeight : 1080;

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

  // Generate only visible flyers on-demand from viewport
  const visibleFlyers = useMemo(
    () => generateVisibleFlyers(flyers, viewport, gridConfig),
    [flyers, viewport, gridConfig]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isDragging) return;

      const now = Date.now();
      if (now - lastTapRef.current > DOUBLE_TAP_DELAY) {
        lastTapRef.current = now;
        return;
      }
      lastTapRef.current = 0;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.changedTouches[0].clientY : e.clientY;

      const { x: tx, y: ty, scale } = transformRef.current;
      const canvasX = (clientX - rect.left - tx) / scale;
      const canvasY = (clientY - rect.top - ty) / scale;

      // Find tapped flyer from visible set
      const { flyerWidth, flyerHeight, gap } = gridConfig;
      const cellW = flyerWidth + gap;
      const cellH = flyerHeight + gap;
      const col = Math.floor(canvasX / cellW);
      const row = Math.floor(canvasY / cellH);

      if (flyers.length === 0) return;

      const rawIndex = ((row * 7919 + col * 104729) % flyers.length + flyers.length) % flyers.length;
      const flyer = flyers[rawIndex];

      setSelectedFlyer({
        ...flyer,
        id: `${col},${row}`,
        layout_x: col * cellW,
        layout_y: row * cellH,
        layout_width: flyerWidth,
        layout_height: flyerHeight,
        layout_rotation: 0,
      });
    },
    [isDragging, flyers, gridConfig, transformRef]
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
      onClick={handleCanvasClick}
      className="w-screen overflow-hidden bg-cave-black touch-none select-none"
      style={{ height: "100vh" }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-cave-white border-t-transparent rounded-full animate-spin" />
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

      <AnimatePresence>
        {selectedFlyer && (
          <FlyerDetailModal
            flyer={selectedFlyer}
            onClose={() => setSelectedFlyer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
