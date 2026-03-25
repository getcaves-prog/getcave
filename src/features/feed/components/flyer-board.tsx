"use client";

import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { useCanvas } from "../hooks/use-canvas";
import { FlyerBoardCanvas } from "./flyer-board-canvas";
import { FlyerBoardOverlay } from "./flyer-board-overlay";
import {
  FLYER_SIZES,
  FLYER_GAP,
  FLYER_OFFSET,
  FLYER_ROTATION,
  CARDS_PER_ROW,
  BREAKPOINT_MOBILE,
} from "../constants/flyer";
import type { FeedEvent, PositionedEvent } from "../types/feed.types";

interface FlyerBoardProps {
  events: FeedEvent[];
  loading: boolean;
  onLoadMore: () => void;
}

/**
 * Simple seeded random number generator based on a string hash.
 * Ensures flyer positions are stable across re-renders.
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return () => {
    hash = (hash * 16807) % 2147483647;
    return (hash & 2147483647) / 2147483647;
  };
}

/**
 * Digital Board Layout - Distributes flyers in a scattered 2D space
 * Creates an organic, pinboard-like arrangement
 * Flyers maintain 2:3 portrait aspect ratio
 */
function calculateFlyerPositions(
  events: FeedEvent[],
  isMobile: boolean
): PositionedEvent[] {
  const { width: cardWidth, height: cardHeight } = isMobile
    ? FLYER_SIZES.mobile
    : FLYER_SIZES.desktop;
  const { x: gapX, y: gapY } = isMobile ? FLYER_GAP.mobile : FLYER_GAP.desktop;
  const { x: maxOffsetX, y: maxOffsetY } = isMobile
    ? FLYER_OFFSET.mobile
    : FLYER_OFFSET.desktop;
  const maxRotation = isMobile ? FLYER_ROTATION.mobile : FLYER_ROTATION.desktop;
  const cardsPerRow = isMobile ? CARDS_PER_ROW.mobile : CARDS_PER_ROW.desktop;

  return events.map((event, index) => {
    const rng = seededRandom(event.id);

    // Calculate position in a wide grid
    const col = index % cardsPerRow;
    const row = Math.floor(index / cardsPerRow);

    // Stagger every other row for organic feel
    const rowOffset = row % 2 === 0 ? 0 : (cardWidth + gapX) / 2;

    const baseX = col * (cardWidth + gapX) + rowOffset;
    const baseY = row * (cardHeight + gapY);

    // Add organic randomness
    const offsetX = (rng() - 0.5) * maxOffsetX * 2;
    const offsetY = (rng() - 0.5) * maxOffsetY * 2;
    const rotation = (rng() - 0.5) * maxRotation * 2;

    // Subtle scale variation for depth effect (0.95 to 1.05)
    const scale = 0.95 + rng() * 0.1;

    return {
      ...event,
      x: baseX + offsetX,
      y: baseY + offsetY,
      rotation,
      scale,
    };
  });
}

export function FlyerBoard({ events, loading, onLoadMore }: FlyerBoardProps) {
  const {
    position,
    scale,
    focusedFlyer,
    pan,
    setPosition,
    zoom,
    focusFlyer,
    clearFocus,
  } = useCanvas();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const positionedEvents = useMemo(
    () => calculateFlyerPositions(events, isMobile),
    [events, isMobile]
  );

  // Calculate board dimensions for infinite loading
  const boardHeight = useMemo(() => {
    const { height: cardHeight } = isMobile
      ? FLYER_SIZES.mobile
      : FLYER_SIZES.desktop;
    const { y: gapY } = isMobile ? FLYER_GAP.mobile : FLYER_GAP.desktop;
    const cardsPerRow = isMobile ? CARDS_PER_ROW.mobile : CARDS_PER_ROW.desktop;
    const totalRows = Math.ceil(events.length / cardsPerRow);
    return totalRows * (cardHeight + gapY);
  }, [events.length, isMobile]);

  // Load more events when user pans near edges
  useEffect(() => {
    if (loading || events.length === 0) return;

    const viewportBottom = -position.y + window.innerHeight;
    const viewportRight = -position.x + window.innerWidth;

    // Load more when panning near bottom OR right edge
    if (viewportBottom > boardHeight * 0.7 || viewportRight > 1500) {
      onLoadMore();
    }
  }, [position, events.length, boardHeight, loading, onLoadMore]);

  const focusedEvent = useMemo(
    () => events.find((e) => e.id === focusedFlyer) ?? null,
    [events, focusedFlyer]
  );

  const handleFlyerTap = useCallback(
    (eventId: string) => {
      focusFlyer(eventId);
    },
    [focusFlyer]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-[100dvh] w-full overflow-hidden"
      style={{
        touchAction: "none", // Prevent browser scroll
      }}
    >
      {/* Board background hint */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(57, 255, 20, 0.08) 1px, transparent 0)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <FlyerBoardCanvas
        events={positionedEvents}
        scale={scale}
        position={position}
        onPan={pan}
        onSetPosition={setPosition}
        onZoom={zoom}
        onFlyerTap={handleFlyerTap}
      />

      {/* Pan hint for first-time users */}
      {events.length > 0 && position.x === 0 && position.y === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
          <div className="flex items-center justify-center gap-8 opacity-40">
            <svg className="w-6 h-6 text-neon-green animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xs text-neon-green font-[family-name:var(--font-space-mono)]">
              {isMobile ? "Desliza para explorar" : "Arrastra para explorar"}
            </span>
            <svg className="w-6 h-6 text-neon-green animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-cave-dark/90 px-4 py-2 text-xs text-cave-fog backdrop-blur-sm border border-cave-rock">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="font-[family-name:var(--font-space-mono)]">
              Cargando más eventos...
            </span>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => zoom(Math.min(2, scale + 0.2))}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-cave-dark/90 border border-cave-rock text-cave-light hover:border-neon-green hover:text-neon-green transition-colors"
          aria-label="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <button
          onClick={() => zoom(Math.max(0.5, scale - 0.2))}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-cave-dark/90 border border-cave-rock text-cave-light hover:border-neon-green hover:text-neon-green transition-colors"
          aria-label="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
        <button
          onClick={() => setPosition(0, 0)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-cave-dark/90 border border-cave-rock text-cave-light hover:border-neon-green hover:text-neon-green transition-colors"
          aria-label="Reset view"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Expanded flyer overlay */}
      <FlyerBoardOverlay event={focusedEvent} onClose={clearFocus} />
    </div>
  );
}
