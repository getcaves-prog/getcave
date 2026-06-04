"use client";

import { motion } from "framer-motion";
import { useAttendance } from "../hooks/use-attendance";

interface AttendanceControlsProps {
  flyerId: string;
  userId: string | undefined;
  /** Called when a logged-out user taps a toggle */
  onSignInRequest?: () => void;
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ─── AttendanceControls ─────────────────────────────────────────────────────
export function AttendanceControls({ flyerId, userId, onSignInRequest }: AttendanceControlsProps) {
  const { total, solo, going, goingSolo, loading, toggleGoing, toggleSolo } = useAttendance(
    flyerId,
    userId
  );

  const handleGoing = async () => {
    if (!userId) { onSignInRequest?.(); return; }
    await toggleGoing();
  };

  const handleSolo = async () => {
    if (!userId) { onSignInRequest?.(); return; }
    await toggleSolo();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Buttons row */}
      <div className="flex gap-2">
        {/* VOY */}
        <motion.button
          type="button"
          onClick={handleGoing}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`flex-1 h-[44px] flex items-center justify-center gap-2 rounded-full border-2 text-xs font-bold uppercase tracking-[0.15em] transition-colors disabled:opacity-50 font-[family-name:var(--font-space-mono)] ${
            going
              ? "border-[#39FF14] text-[#39FF14] bg-[#39FF14]/10 shadow-[0_0_12px_rgba(57,255,20,0.15)]"
              : "border-cave-ash text-cave-fog hover:border-cave-fog"
          }`}
          aria-pressed={going}
          aria-label={going ? "Ya voy — tocar para cancelar" : "Marcar que voy"}
        >
          <CheckIcon />
          {going ? "Voy ✓" : "Voy"}
        </motion.button>

        {/* VOY SOLO */}
        <motion.button
          type="button"
          onClick={handleSolo}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`flex-1 h-[44px] flex items-center justify-center gap-2 rounded-full border-2 text-xs font-bold uppercase tracking-[0.15em] transition-colors disabled:opacity-50 font-[family-name:var(--font-space-mono)] ${
            goingSolo
              ? "border-[#39FF14] text-[#39FF14] bg-[#39FF14]/10 shadow-[0_0_12px_rgba(57,255,20,0.15)]"
              : "border-cave-ash text-cave-fog hover:border-cave-fog"
          }`}
          aria-pressed={goingSolo}
          aria-label={goingSolo ? "Voy solo — tocar para cambiar" : "Marcar que voy solo"}
        >
          <PersonIcon />
          {goingSolo ? "Solo ✓" : "Voy solo"}
        </motion.button>
      </div>

      {/* Counter line — only when there are attendees */}
      {(total > 0 || solo > 0) && (
        <p className="text-[10px] text-cave-fog text-center font-[family-name:var(--font-space-mono)] tracking-[0.1em]">
          {total} {total === 1 ? "va" : "van"}
          {solo > 0 && ` · ${solo} ${solo === 1 ? "solo" : "solos"}`}
        </p>
      )}
    </div>
  );
}
