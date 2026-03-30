"use client";

import { useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { LayoutFlyer } from "../types/canvas.types";

function computeDaysRemaining(expiresAt: string): number | null {
  const expiryDate = new Date(expiresAt);
  if (isNaN(expiryDate.getTime())) return null;
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

interface FlyerDetailModalProps {
  flyer: LayoutFlyer;
  onClose: () => void;
}

export function FlyerDetailModal({ flyer, onClose }: FlyerDetailModalProps) {
  const daysRemaining = useMemo(() => {
    if (!flyer.expires_at) return null;
    return computeDaysRemaining(flyer.expires_at);
  }, [flyer.expires_at]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 safe-area-bottom"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ willChange: "opacity" }}
    >
      {/* Gaussian blur backdrop */}
      <motion.div
        className="absolute inset-0 backdrop-blur-2xl"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: "radial-gradient(ellipse at center, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.92) 70%, rgba(0,0,0,0.97) 100%)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      />

      {/* Content — emerges from deep in the cave */}
      <motion.div
        className="relative z-10 flex flex-col items-center max-w-[420px] w-full"
        initial={{ scale: 0.15, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.15, opacity: 0, y: 40 }}
        transition={{
          type: "spring",
          stiffness: 240,
          damping: 26,
          mass: 0.9,
        }}
        style={{ willChange: "transform, opacity" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-cave-black/90 border border-cave-ash/40 text-cave-fog hover:text-cave-white hover:border-cave-white/50 transition-colors"
          aria-label="Close flyer detail"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Flyer image */}
        <motion.div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "7 / 10" }}
          initial={{ filter: "brightness(0)" }}
          animate={{ filter: "brightness(1)" }}
          exit={{ filter: "brightness(0)" }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Image
            src={flyer.image_url}
            alt={flyer.title ?? "Event flyer"}
            fill
            sizes="420px"
            className="object-cover"
            loading="eager"
            unoptimized
          />
        </motion.div>

        {/* Expiry badge */}
        {daysRemaining !== null && (
          <div className="mt-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {daysRemaining === 0
                ? "Expires today"
                : `Expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`}
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
