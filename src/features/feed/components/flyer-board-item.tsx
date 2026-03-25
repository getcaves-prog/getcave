"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { PositionedEvent } from "../types/feed.types";

interface FlyerBoardItemProps {
  event: PositionedEvent;
  index: number;
  onTap: (eventId: string) => void;
}

const STAGGER_DELAY = 0.03;
const DOUBLE_TAP_THRESHOLD = 300;

export function FlyerBoardItem({ event, index, onTap }: FlyerBoardItemProps) {
  const lastTapRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD) {
      // Double-tap: heat/calor action (Phase 3)
      console.log("Calor double-tap on event:", event.id);
      return;
    }

    // Single tap: expand flyer
    // Use a small delay to distinguish from double-tap
    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= DOUBLE_TAP_THRESHOLD) {
        onTap(event.id);
      }
    }, DOUBLE_TAP_THRESHOLD);
  }, [event.id, onTap]);

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: event.x,
        top: event.y,
        rotate: event.rotation,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * STAGGER_DELAY,
      }}
      onClick={handleTap}
    >
      <div
        className="group relative w-[140px] h-[200px] sm:w-[180px] sm:h-[260px] overflow-hidden rounded-lg border border-[#2A2A2A]/50 shadow-md transition-shadow duration-200 hover:shadow-[0_0_20px_rgba(57,255,20,0.1)]"
        style={{ perspective: "600px" }}
      >
        {/* 3D tilt container — desktop only via group-hover */}
        <div className="relative h-full w-full transition-transform duration-200 ease-out group-hover:scale-105 group-hover:[transform:rotateX(2deg)_rotateY(-3deg)]">
          {/* Flyer image */}
          <Image
            src={event.flyer_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 140px, 180px"
          />

          {/* Bottom title overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6">
            <p className="truncate text-xs font-medium text-white/90 sm:text-sm">
              {event.title}
            </p>
          </div>

          {/* Heat count badge */}
          {event.heat_count != null && event.heat_count > 0 && (
            <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-[#FF6B2B]/90 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              <span>🔥</span>
              <span>{event.heat_count}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
