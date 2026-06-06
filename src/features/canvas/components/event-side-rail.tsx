"use client";

import { motion } from "framer-motion";

interface EventSideRailProps {
  goingSolo: boolean;
  loading: boolean;
  onToggleSolo: () => void;
  onOpenChat: () => void;
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/**
 * Vertical action rail pinned to the right edge of the flyer card.
 * Elegant-punk: Space Mono micro-labels, thin borders, neon-on-hover, glassy
 * backdrop so it floats over the card. Holds the secondary actions (VOY SOLO +
 * CONVERSACIÓN) — the primary "VOY" stays in the card body.
 */
export function EventSideRail({ goingSolo, loading, onToggleSolo, onOpenChat }: EventSideRailProps) {
  const itemLabel = "text-[8px] uppercase tracking-[0.18em] text-cave-fog font-[family-name:var(--font-space-mono)] leading-none";

  return (
    <div className="flex flex-col items-center gap-3 rounded-full border border-cave-ash/40 bg-cave-black/55 backdrop-blur-sm px-1.5 py-3 shadow-[0_0_24px_rgba(0,0,0,0.4)]">
      {/* VOY SOLO toggle */}
      <div className="flex flex-col items-center gap-1">
        <motion.button
          type="button"
          onClick={onToggleSolo}
          disabled={loading}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`w-11 h-11 flex items-center justify-center rounded-full border-2 transition-all disabled:opacity-50 ${
            goingSolo
              ? "border-[#FFFFFF] text-cave-black bg-[#FFFFFF] shadow-[0_0_16px_rgba(255,255,255,0.25)]"
              : "border-cave-ash/60 text-cave-fog hover:border-cave-fog hover:text-cave-light"
          }`}
          aria-pressed={goingSolo}
          aria-label={goingSolo ? "Voy solo — tocar para cambiar" : "Marcar que voy solo"}
        >
          <PersonIcon />
        </motion.button>
        <span className={itemLabel}>{goingSolo ? "Solo ✓" : "Solo"}</span>
      </div>

      {/* Chat */}
      <div className="flex flex-col items-center gap-1">
        <motion.button
          type="button"
          onClick={onOpenChat}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-11 h-11 flex items-center justify-center rounded-full border-2 border-cave-ash/60 text-cave-fog hover:border-cave-fog hover:text-cave-light transition-all"
          aria-label="Abrir conversación del evento"
        >
          <ChatIcon />
        </motion.button>
        <span className={itemLabel}>Chat</span>
      </div>
    </div>
  );
}
