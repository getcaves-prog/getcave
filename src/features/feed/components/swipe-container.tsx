"use client";

import { useState, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  type PanInfo,
} from "framer-motion";
import { FlyerCard } from "./flyer-card";
import type { FeedEvent } from "../types/feed.types";

interface SwipeContainerProps {
  events: FeedEvent[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onReachEnd: () => void;
}

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 300;

export function SwipeContainer({
  events,
  currentIndex,
  onIndexChange,
  onReachEnd,
}: SwipeContainerProps) {
  const [direction, setDirection] = useState(0);

  const goToNext = useCallback(() => {
    if (currentIndex < events.length - 1) {
      setDirection(1);
      onIndexChange(currentIndex + 1);

      // Pre-load more events when approaching the end
      if (currentIndex >= events.length - 3) {
        onReachEnd();
      }
    }
  }, [currentIndex, events.length, onIndexChange, onReachEnd]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      onIndexChange(currentIndex - 1);
    }
  }, [currentIndex, onIndexChange]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;

      // Swipe up (negative Y) → next
      if (
        offset.y < -SWIPE_THRESHOLD ||
        velocity.y < -SWIPE_VELOCITY
      ) {
        goToNext();
        return;
      }

      // Swipe down (positive Y) → previous
      if (
        offset.y > SWIPE_THRESHOLD ||
        velocity.y > SWIPE_VELOCITY
      ) {
        goToPrevious();
        return;
      }
    },
    [goToNext, goToPrevious]
  );

  const currentEvent = events[currentIndex];

  if (!currentEvent) return null;

  const variants = {
    enter: (dir: number) => ({
      y: dir > 0 ? "100%" : "-100%",
      opacity: 0.5,
    }),
    center: {
      y: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      y: dir > 0 ? "-100%" : "100%",
      opacity: 0.5,
    }),
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0A0A0A]">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentEvent.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            y: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="absolute inset-0"
        >
          <FlyerCard event={currentEvent} />
        </motion.div>
      </AnimatePresence>

      {/* Scroll indicator dots */}
      <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1">
        {events.slice(
          Math.max(0, currentIndex - 2),
          Math.min(events.length, currentIndex + 3)
        ).map((event, i) => {
          const actualIndex = Math.max(0, currentIndex - 2) + i;
          return (
            <div
              key={event.id}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                actualIndex === currentIndex
                  ? "w-4 bg-[#FF4D4D]"
                  : "w-1.5 bg-white/40"
              }`}
            />
          );
        })}
      </div>

      {/* Event counter */}
      <div className="absolute right-4 top-14 z-10 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm">
        {currentIndex + 1} / {events.length}
      </div>
    </div>
  );
}
