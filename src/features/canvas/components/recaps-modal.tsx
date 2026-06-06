"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecapsGallery } from "@/features/recaps/components/recaps-gallery";

interface RecapsModalProps {
  flyerId: string;
  isOwner: boolean;
  onClose: () => void;
}

/**
 * Lateral modal for Recaps.
 *
 * Desktop: side panel anchored to the right (w-[380px], full viewport height),
 *          slides in from the right. Clicking the backdrop closes it.
 * Mobile:  near-fullscreen sheet (top ~5%), slides up from bottom.
 *
 * Reuses RecapsGallery — no duplicate logic.
 */
export function RecapsModal({ flyerId, isOwner, onClose }: RecapsModalProps) {
  // Keyboard: Escape closes
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
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[70] bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — desktop: right side panel / mobile: bottom sheet */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Recaps del evento"
        className={[
          // Stacking
          "fixed z-[71]",
          // Desktop: anchored right, full height, 380 px wide
          "md:top-0 md:right-0 md:bottom-0 md:w-[380px] md:rounded-l-2xl",
          // Mobile: near-fullscreen sheet from bottom
          "bottom-0 left-0 right-0 max-h-[92dvh] rounded-t-2xl md:max-h-none",
          // Background
          "bg-[#0A0A0A] border-l border-cave-ash/30",
          // Layout
          "flex flex-col overflow-hidden",
        ].join(" ")}
        /* Desktop: slide in from right */
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{ willChange: "transform, opacity" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cave-ash/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cave-fog"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span
              className="text-[11px] uppercase tracking-[0.2em] text-cave-white font-[family-name:var(--font-space-mono)]"
            >
              Recaps
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-rock/80 text-cave-fog hover:text-cave-white transition-colors"
            aria-label="Cerrar recaps"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable gallery */}
        <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide">
          <RecapsGallery flyerId={flyerId} isOwner={isOwner} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
