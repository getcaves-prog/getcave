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

function getGridConfig(): GridConfig {
  if (typeof window === "undefined") return GRID_CONFIG.desktop;
  return window.innerWidth < MOBILE_BREAKPOINT
    ? GRID_CONFIG.mobile
    : GRID_CONFIG.desktop;
}

function computeGridLayout(flyers: Flyer[], config: GridConfig): LayoutFlyer[] {
  const { columns, flyerWidth, flyerHeight, gap } = config;
  const rows = Math.ceil(flyers.length / columns);

  // Total grid dimensions
  const gridWidth = columns * flyerWidth + (columns - 1) * gap;
  const gridHeight = rows * flyerHeight + (rows - 1) * gap;

  // Offset to center the grid around (0, 0)
  const offsetX = -gridWidth / 2;
  const offsetY = -gridHeight / 2;

  return flyers.map((flyer, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    return {
      ...flyer,
      layout_x: offsetX + col * (flyerWidth + gap),
      layout_y: offsetY + row * (flyerHeight + gap),
      layout_width: flyerWidth,
      layout_height: flyerHeight,
      layout_rotation: 0,
    };
  });
}

function computeCenter(flyers: LayoutFlyer[]): { x: number; y: number } {
  if (flyers.length === 0) return { x: 0, y: 0 };

  const sumX = flyers.reduce((acc, f) => acc + f.layout_x, 0);
  const sumY = flyers.reduce((acc, f) => acc + f.layout_y, 0);

  return {
    x: sumX / flyers.length,
    y: sumY / flyers.length,
  };
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

const DOUBLE_TAP_DELAY = 300;

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

  // Listen for window resize to update grid config
  useEffect(() => {
    function handleResize() {
      setGridConfig(getGridConfig());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute grid layout from raw flyers
  const layoutFlyers = useMemo(
    () => computeGridLayout(flyers, gridConfig),
    [flyers, gridConfig]
  );

  // Center on flyer cluster when loaded
  useEffect(() => {
    if (layoutFlyers.length === 0) return;

    const center = computeCenter(layoutFlyers);
    const windowW = window.innerWidth;
    const windowH = window.innerHeight - CANVAS_LIMITS.HEADER_HEIGHT;

    jumpTo(-center.x + windowW / 2, -center.y + windowH / 2, 0.8);
  }, [layoutFlyers, jumpTo]);

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

      // Get click position relative to canvas container
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.changedTouches[0].clientY : e.clientY;

      // Convert screen coords to canvas coords
      const { x: tx, y: ty, scale } = transformRef.current;
      const canvasX = (clientX - rect.left - tx) / scale;
      const canvasY = (clientY - rect.top - ty) / scale;

      // Find which flyer was tapped
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
            <div className="w-6 h-6 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
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
