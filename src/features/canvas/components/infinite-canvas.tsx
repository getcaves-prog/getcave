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

const VIEWPORT_PADDING = 400;
const DOUBLE_TAP_DELAY = 300;

function getGridConfig(): GridConfig {
  if (typeof window === "undefined") return GRID_CONFIG.desktop;
  return window.innerWidth < MOBILE_BREAKPOINT
    ? GRID_CONFIG.mobile
    : GRID_CONFIG.desktop;
}

/**
 * Fills a grid of `rows` x `columns` with flyers, repeating cyclically.
 * 3 rows fixed vertically, extends horizontally.
 */
function computeInfiniteGrid(flyers: Flyer[], config: GridConfig): LayoutFlyer[] {
  if (flyers.length === 0) return [];

  const { columns, rows, flyerWidth, flyerHeight, gap } = config;
  const totalSlots = rows * columns;

  const gridHeight = rows * flyerHeight + (rows - 1) * gap;
  const offsetY = -gridHeight / 2;

  const result: LayoutFlyer[] = [];

  for (let i = 0; i < totalSlots; i++) {
    const flyer = flyers[i % flyers.length];
    const col = Math.floor(i / rows);
    const row = i % rows;

    result.push({
      ...flyer,
      id: `${flyer.id}-${i}`,
      layout_x: col * (flyerWidth + gap),
      layout_y: offsetY + row * (flyerHeight + gap),
      layout_width: flyerWidth,
      layout_height: flyerHeight,
      layout_rotation: 0,
    });
  }

  return result;
}

function isInViewport(flyer: LayoutFlyer, viewport: Viewport): boolean {
  const flyerRight = flyer.layout_x + flyer.layout_width;
  const flyerBottom = flyer.layout_y + flyer.layout_height;

  return (
    flyerRight >= viewport.left &&
    flyer.layout_x <= viewport.right &&
    flyerBottom >= viewport.top &&
    flyer.layout_y <= viewport.bottom
  );
}

export function InfiniteCanvas() {
  const { flyers, loading, error } = useFlyers();
  const { springX, springY, springScale, isDragging, bind, jumpTo, transformRef } = useCanvasGestures();

  const [gridConfig, setGridConfig] = useState<GridConfig>(getGridConfig);
  const [selectedFlyer, setSelectedFlyer] = useState<LayoutFlyer | null>(null);
  const lastTapRef = useRef(0);

  const [viewport, setViewport] = useState<Viewport>({
    left: -5000,
    top: -5000,
    right: 5000,
    bottom: 5000,
  });

  useEffect(() => {
    function handleResize() {
      setGridConfig(getGridConfig());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const layoutFlyers = useMemo(
    () => computeInfiniteGrid(flyers, gridConfig),
    [flyers, gridConfig]
  );

  // Center vertically, start at the left edge
  useEffect(() => {
    if (layoutFlyers.length === 0) return;

    const windowW = window.innerWidth;
    const windowH = window.innerHeight - CANVAS_LIMITS.HEADER_HEIGHT;

    // Start centered vertically, slightly offset from left
    jumpTo(windowW * 0.1, windowH / 2, 0.8);
  }, [layoutFlyers, jumpTo]);

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
    () => layoutFlyers.filter((f) => isInViewport(f, viewport)),
    [layoutFlyers, viewport]
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

      const tapped = layoutFlyers.find(
        (f) =>
          canvasX >= f.layout_x &&
          canvasX <= f.layout_x + f.layout_width &&
          canvasY >= f.layout_y &&
          canvasY <= f.layout_y + f.layout_height
      );

      if (tapped) setSelectedFlyer(tapped);
    },
    [isDragging, layoutFlyers, transformRef]
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
      style={{ height: `calc(100vh - ${CANVAS_LIMITS.HEADER_HEIGHT}px)` }}
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
        className="relative origin-top-left pointer-events-none"
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
