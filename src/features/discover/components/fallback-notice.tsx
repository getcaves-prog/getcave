"use client";

import { motion } from "framer-motion";

interface FallbackNoticeProps {
  /** City the user searched in — interpolated into the copy when present. */
  city?: string;
}

/**
 * Non-blocking notice shown ABOVE the canvas when the discovery results are NOT
 * local (the location filter dropped everything, so we fell back to related
 * events). Punk-cave styled: Space Mono, subtle neon-orange border, never
 * blocks interaction with the canvas underneath.
 */
export function FallbackNotice({ city }: FallbackNoticeProps) {
  const where = city?.trim() ? ` cerca de ${city.trim()}` : " cerca tuyo";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="pointer-events-none mx-auto max-w-[560px]"
    >
      <p className="rounded-md border border-neon-orange/40 bg-cave-black/80 px-3 py-2 text-center font-mono text-[11px] leading-snug text-neon-orange/90">
        No encontramos eventos{where}. Te mostramos otros relacionados.
      </p>
    </motion.div>
  );
}
