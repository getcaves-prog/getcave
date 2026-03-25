"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useHeat } from "../hooks/use-heat";

interface HeatButtonProps {
  eventId: string;
  initialCount?: number;
}

export function HeatButton({ eventId, initialCount = 0 }: HeatButtonProps) {
  const { heated, count, loading, toggleHeat } = useHeat(
    eventId,
    initialCount
  );

  return (
    <motion.button
      type="button"
      onClick={toggleHeat}
      disabled={loading}
      className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
      style={{
        backgroundColor: heated
          ? "rgba(255, 107, 43, 0.15)"
          : "rgba(74, 74, 74, 0.3)",
        color: heated ? "#FF6B2B" : "#8A8A8A",
        boxShadow: heated ? "0 0 12px rgba(255, 107, 43, 0.3)" : "none",
      }}
      whileTap={{ scale: 0.95 }}
      aria-label={heated ? "Quitar calor" : "Dar calor"}
      aria-pressed={heated}
    >
      {/* Pulse ring on heat */}
      <AnimatePresence>
        {heated && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(255, 107, 43, 0.4)" }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            key="pulse"
          />
        )}
      </AnimatePresence>

      {/* Flame icon */}
      <motion.span
        animate={
          heated
            ? { scale: [0, 1.2, 1], rotate: [0, -10, 10, 0] }
            : { scale: 1, rotate: 0 }
        }
        transition={
          heated
            ? { type: "spring", stiffness: 400, damping: 15, duration: 0.4 }
            : { duration: 0.2 }
        }
        className="inline-flex"
        aria-hidden="true"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={heated ? "#FF6B2B" : "none"}
          stroke={heated ? "#FF6B2B" : "currentColor"}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      </motion.span>

      {/* Count with number flip */}
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="tabular-nums"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
