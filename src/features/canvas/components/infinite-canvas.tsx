"use client";

import { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { motion, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useFlyers } from "../hooks/use-flyers";
import { useCanvasGestures } from "../hooks/use-canvas-gestures";
import { useCanvasReadyStore } from "../stores/canvas-ready.store";
import { useActionModalStore } from "@/shared/stores/action-modal.store";
import { CanvasFlyer } from "./canvas-flyer";
import { FlyerGrid } from "./flyer-grid";
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

const VIEWPORT_PADDING = 1200;

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
        grid_id: `${col},${row}`,
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
  const { flyers, loading, error, mode } = useFlyers();
  const { springX, springY, springScale, isDragging, dragOccurredRef, bind, jumpTo, transformRef } = useCanvasGestures();
  const incrementImagesLoaded = useCanvasReadyStore((s) => s.incrementImagesLoaded);
  const openActionModal = useActionModalStore((s) => s.open);

  const handleUpload = useCallback(() => {
    openActionModal("upload");
  }, [openActionModal]);

  const handleImageLoad = useCallback(() => {
    incrementImagesLoaded();
  }, [incrementImagesLoaded]);

  const [gridConfig, setGridConfig] = useState<GridConfig>(getGridConfig);
  const [selectedFlyer, setSelectedFlyer] = useState<LayoutFlyer | null>(null);
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

  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingViewportRef = useRef<{ x: number; y: number; scale: number } | null>(null);

  const updateViewport = useCallback((x: number, y: number, scale: number) => {
    pendingViewportRef.current = { x, y, scale };

    if (throttleRef.current) return;

    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
      const pending = pendingViewportRef.current;
      if (!pending) return;

      const windowW = typeof window !== "undefined" ? window.innerWidth : 1920;
      const windowH = typeof window !== "undefined" ? window.innerHeight : 1080;

      setViewport({
        left: -pending.x / pending.scale - VIEWPORT_PADDING,
        top: -pending.y / pending.scale - VIEWPORT_PADDING,
        right: (-pending.x + windowW) / pending.scale + VIEWPORT_PADDING,
        bottom: (-pending.y + windowH) / pending.scale + VIEWPORT_PADDING,
      });
    }, 200);
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

  // Prefetch images so they're in browser cache before mounting
  const prefetchedRef = useRef(new Set<string>());
  useEffect(() => {
    for (const f of visibleFlyers) {
      if (f.image_url && !prefetchedRef.current.has(f.image_url)) {
        prefetchedRef.current.add(f.image_url);
        const img = new window.Image();
        img.src = f.image_url;
      }
    }
  }, [visibleFlyers]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Ignore if the gesture was a drag (pan), not a tap
      if (isDragging || dragOccurredRef.current) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.changedTouches[0].clientY : e.clientY;

      const { x: tx, y: ty, scale } = transformRef.current;
      const canvasX = (clientX - rect.left - tx) / scale;
      const canvasY = (clientY - rect.top - ty) / scale;

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
        grid_id: `${col},${row}`,
        layout_x: col * cellW,
        layout_y: row * cellH,
        layout_width: flyerWidth,
        layout_height: flyerHeight,
        layout_rotation: 0,
      });
    },
    [isDragging, dragOccurredRef, flyers, gridConfig, transformRef]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-dvh bg-cave-black text-cave-fog">
        <p className="font-mono text-sm">Error loading flyers: {error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="w-screen flex items-center justify-center bg-cave-black"
        style={{ height: "100dvh" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-cave-white border-t-transparent rounded-full animate-spin" />
          <p className="text-cave-fog text-sm font-mono">Loading flyers...</p>
        </div>
      </div>
    );
  }

  if (mode === "empty") {
    return (
      <div
        className="w-screen flex flex-col items-center justify-center px-8 bg-cave-black"
        style={{ height: "100dvh" }}
      >
        <div className="w-16 h-16 rounded-full bg-cave-rock flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cave-fog">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h2 className="text-lg text-cave-white font-[family-name:var(--font-space-mono)] text-center mb-2">
          No flyers nearby
        </h2>
        <p className="text-sm text-cave-fog text-center max-w-[280px] mb-6">
          No events in your area yet. Be the first to share what&apos;s happening!
        </p>
        <button
          onClick={handleUpload}
          className="px-6 py-3 rounded-full bg-cave-white text-cave-black text-sm font-medium"
        >
          Upload a Flyer
        </button>
      </div>
    );
  }

  if (mode === "grid") {
    return <FlyerGrid flyers={flyers} />;
  }

  // mode === "canvas" — infinite tiling canvas
  return (
    <div
      {...bind()}
      onClick={handleCanvasClick}
      className="w-screen overflow-hidden bg-cave-black touch-none select-none"
      style={{ height: "100dvh", overscrollBehavior: "none" }}
    >
      <motion.div
        className="relative origin-top-left"
        style={{
          x: springX,
          y: springY,
          scale: springScale,
          width: "1px",
          height: "1px",
          willChange: "transform",
        }}
      >
        {visibleFlyers.map((flyer) => (
          <CanvasFlyer key={flyer.grid_id} flyer={flyer} onImageLoad={handleImageLoad} />
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
