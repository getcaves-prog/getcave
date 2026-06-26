"use client";

import { motion } from "framer-motion";

/**
 * Subtle, non-blocking indicator shown while the scraped (FB/IG) second pass is
 * in flight. Sits above the canvas results without interrupting them.
 */
export function ScrapingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
    >
      <div className="flex items-center gap-2 rounded-full border border-cave-ash bg-cave-stone/90 px-4 py-2 backdrop-blur-sm">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-cave-light border-t-transparent" />
        <span className="font-[family-name:var(--font-space-mono)] text-xs text-cave-light">
          Buscando en Facebook e Instagram…
        </span>
      </div>
    </motion.div>
  );
}
