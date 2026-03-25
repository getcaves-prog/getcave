"use client";

import { useRef } from "react";
import { useInfiniteCanvas } from "../hooks/use-infinite-canvas";
import { CanvasFlyerItem } from "./canvas-flyer-item";
import type { PositionedEvent } from "../types/feed.types";

interface InfiniteCanvasProps {
  events: PositionedEvent[];
  isMobile: boolean;
  onFlyerTap: (eventId: string) => void;
  onFlyerDoubleTap?: (eventId: string) => void;
}

export function InfiniteCanvas({
  events,
  isMobile,
  onFlyerTap,
  onFlyerDoubleTap,
}: InfiniteCanvasProps) {
  const { position, cursorStyle, handlers } = useInfiniteCanvas();

  return (
    <div
      className="absolute inset-0"
      style={{ 
        touchAction: "none", 
        cursor: cursorStyle,
        backgroundColor: "#0a0a0a"
      }}
      {...handlers}
    >
      {/* Container that moves with drag */}
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          willChange: "transform",
        }}
      >
        <div className="relative">
          {events.map((event, index) => (
            <CanvasFlyerItem
              key={event.id}
              event={event}
              index={index}
              isMobile={isMobile}
              onTap={onFlyerTap}
              onDoubleTap={onFlyerDoubleTap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
