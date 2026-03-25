"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { InfiniteCanvas } from "./infinite-canvas";
import { FlyerBoardOverlay } from "./flyer-board-overlay";
import {
  FLYER_SIZES,
  FLYER_GAP,
  FLYER_OFFSET,
  FLYER_ROTATION,
  CARDS_PER_ROW,
} from "../constants/flyer";
import type { FeedEvent, PositionedEvent } from "../types/feed.types";

interface FlyerBoardProps {
  events: FeedEvent[];
  loading: boolean;
  onLoadMore?: () => void;
}

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return () => {
    hash = (hash * 16807) % 2147483647;
    return (hash & 2147483647) / 2147483647;
  };
}

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
    const col = index % cardsPerRow;
    const row = Math.floor(index / cardsPerRow);
    const rowOffset = row % 2 === 0 ? 0 : (cardWidth + gapX) / 2;
    const baseX = col * (cardWidth + gapX) + rowOffset;
    const baseY = row * (cardHeight + gapY);
    const offsetX = (rng() - 0.5) * maxOffsetX * 2;
    const offsetY = (rng() - 0.5) * maxOffsetY * 2;
    const rotation = (rng() - 0.5) * maxRotation * 2;
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

export function FlyerBoard({ events, loading }: FlyerBoardProps) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const [focusedFlyer, setFocusedFlyer] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const positionedEvents = useMemo(
    () => calculateFlyerPositions(events, isMobile),
    [events, isMobile]
  );

  // Find focused event
  const focusedEvent = useMemo(
    () => events.find((e) => e.id === focusedFlyer) ?? null,
    [events, focusedFlyer]
  );

  const handleFlyerTap = useCallback(
    (eventId: string) => {
      setFocusedFlyer(eventId);
    },
    []
  );

  const handleFlyerDoubleTap = useCallback(
    (eventId: string) => {
      setFocusedFlyer(eventId);
    },
    []
  );

  const clearFocus = useCallback(() => {
    setFocusedFlyer(null);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-cave-dark">
      <InfiniteCanvas
        events={positionedEvents}
        isMobile={isMobile}
        onFlyerTap={handleFlyerTap}
        onFlyerDoubleTap={handleFlyerDoubleTap}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 rounded-full bg-cave-dark/90 px-4 py-2 text-xs text-cave-fog backdrop-blur-sm border border-cave-rock">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="font-[family-name:var(--font-space-mono)]">
              Cargando más eventos...
            </span>
          </div>
        </div>
      )}

      {/* Expanded flyer overlay */}
      <FlyerBoardOverlay event={focusedEvent} onClose={clearFocus} />
    </div>
  );
}
