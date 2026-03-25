"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import { useCanvas } from "../hooks/use-canvas";
import { FlyerBoardCanvas } from "./flyer-board-canvas";
import { FlyerBoardOverlay } from "./flyer-board-overlay";
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

function calculateFlyerPositions(
  events: FeedEvent[],
  containerWidth: number
): PositionedEvent[] {
  const cols = containerWidth < 640 ? 3 : containerWidth < 1024 ? 4 : 5;
  const cardWidth = containerWidth < 640 ? 140 : 180;
  const cardHeight = containerWidth < 640 ? 200 : 260;
  const gap = 20;

  return events.map((event, index) => {
    const rng = seededRandom(event.id);

    const col = index % cols;
    const row = Math.floor(index / cols);
    const baseX = col * (cardWidth + gap);
    const baseY = row * (cardHeight + gap);

    // Add organic randomness using seeded RNG
    const offsetX = (rng() - 0.5) * 40; // -20 to +20
    const offsetY = (rng() - 0.5) * 30; // -15 to +15
    const rotation = (rng() - 0.5) * 6; // -3 to +3 degrees

    return {
      ...event,
      x: baseX + offsetX,
      y: baseY + offsetY,
      rotation,
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

  // Calculate container width for layout
  const containerWidth =
    typeof window !== "undefined" ? window.innerWidth : 375;

  const positionedEvents = useMemo(
    () => calculateFlyerPositions(events, containerWidth),
    [events, containerWidth]
  );

  // Load more events when user pans near the bottom edge of content
  useEffect(() => {
    if (loading || events.length === 0) return;

    const cols = containerWidth < 640 ? 3 : containerWidth < 1024 ? 4 : 5;
    const cardHeight = containerWidth < 640 ? 200 : 260;
    const gap = 20;
    const totalRows = Math.ceil(events.length / cols);
    const contentHeight = totalRows * (cardHeight + gap);

    // If the user has scrolled past 70% of the content height, load more
    const viewportBottom = -position.y + window.innerHeight;
    if (viewportBottom > contentHeight * 0.7) {
      onLoadMore();
    }
  }, [position.y, events.length, containerWidth, loading, onLoadMore]);

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
    <div ref={containerRef} className="relative h-[100dvh] w-full">
      <FlyerBoardCanvas
        events={positionedEvents}
        scale={scale}
        position={position}
        onPan={pan}
        onSetPosition={setPosition}
        onZoom={zoom}
        onFlyerTap={handleFlyerTap}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2">
          <div className="rounded-full bg-[#0A0A0A]/80 px-4 py-2 text-xs text-white/60 backdrop-blur-sm">
            Cargando más eventos...
          </div>
        </div>
      )}

      {/* Expanded flyer overlay */}
      <FlyerBoardOverlay event={focusedEvent} onClose={clearFocus} />
    </div>
  );
}
