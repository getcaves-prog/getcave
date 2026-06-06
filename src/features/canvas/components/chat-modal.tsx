"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EventThread } from "@/features/conversations/components/event-thread";

interface ChatModalProps {
  flyerId: string;
  label: string;
  currentUserId?: string;
  onClose: () => void;
}

/**
 * Lateral modal for the event CONVERSACIÓN (chat).
 *
 * Mirrors RecapsModal so both lateral panels feel identical (elegant punk):
 * Desktop: right-anchored side panel (w-[380px], full height), slides in from right.
 * Mobile:  near-fullscreen sheet, slides up from bottom. Backdrop / Escape close it.
 *
 * Reuses EventThread (subjectType="flyer") — no chat logic duplicated.
 */
export function ChatModal({ flyerId, label, currentUserId, onClose }: ChatModalProps) {
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

      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Conversación del evento"
        className={[
          "fixed z-[71]",
          "md:top-0 md:right-0 md:bottom-0 md:w-[380px] md:rounded-l-2xl",
          "bottom-0 left-0 right-0 max-h-[92dvh] rounded-t-2xl md:max-h-none",
          "bg-[#0A0A0A] border-l border-cave-ash/30",
          "flex flex-col overflow-hidden",
        ].join(" ")}
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{ willChange: "transform, opacity" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cave-ash/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cave-fog shrink-0"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] uppercase tracking-[0.2em] text-cave-white font-[family-name:var(--font-space-mono)] leading-none">
                Conversación
              </span>
              <span className="text-[10px] text-cave-ash font-[family-name:var(--font-inter)] truncate mt-1">
                {label}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-rock/80 text-cave-fog hover:text-cave-white transition-colors shrink-0"
            aria-label="Cerrar conversación"
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

        {/* Thread (manages its own scroll area) */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <EventThread subjectType="flyer" subjectId={flyerId} currentUserId={currentUserId} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
