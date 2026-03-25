"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistance } from "@/shared/lib/utils/geo";
import { formatEventDateRange } from "@/shared/lib/utils/format";
import type { FeedEvent } from "../types/feed.types";

interface FlyerBoardOverlayProps {
  event: FeedEvent | null;
  onClose: () => void;
}

export function FlyerBoardOverlay({ event, onClose }: FlyerBoardOverlayProps) {
  // Close on Escape key
  useEffect(() => {
    if (!event) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [event, onClose]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (event) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [event]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      // Swipe down to close
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="relative flex max-h-[90dvh] w-full max-w-md flex-col items-center px-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, y: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragEnd={handleDragEnd}
          >
            {/* Drag indicator */}
            <div className="mb-3 h-1 w-10 rounded-full bg-white/30" />

            {/* Flyer image */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg">
              <Image
                src={event.flyer_url}
                alt={event.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
              />
            </div>

            {/* Info section */}
            <div className="mt-4 w-full space-y-2">
              <h2
                className="text-xl font-bold text-[#39FF14]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {event.title}
              </h2>

              <p className="text-sm text-white/80">
                {formatEventDateRange(event.date, event.time_start, event.time_end)}
              </p>

              <div className="flex items-center gap-2 text-sm text-white/70">
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                  />
                </svg>
                <span>{event.venue_name}</span>
                <span className="text-white/40">·</span>
                <span>{formatDistance(event.distance_meters)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-3">
                <Link
                  href={`/event/${event.id}`}
                  className="flex-1 rounded-lg bg-[#39FF14] px-4 py-2.5 text-center text-sm font-bold text-[#050505] transition-colors hover:bg-[#39FF14]/90"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  Ver detalles
                </Link>
                <button
                  type="button"
                  onClick={() => console.log("Calor on event:", event.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#FF6B2B]/50 px-4 py-2.5 text-sm font-bold text-[#FF6B2B] transition-colors hover:bg-[#FF6B2B]/10"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  🔥 Calor
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
