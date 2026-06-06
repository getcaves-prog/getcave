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
    <div className="flex flex-col gap-2.5">
      {/* Buttons row */}
      <div className="flex gap-2.5">
        {/* VOY */}
        <motion.button
          type="button"
          onClick={handleGoing}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`flex-1 h-[48px] flex items-center justify-center gap-2 rounded-full border-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-all disabled:opacity-50 font-[family-name:var(--font-space-mono)] ${
            going
              ? "border-[#FFFFFF] text-cave-black bg-[#FFFFFF] shadow-[0_0_16px_rgba(255,255,255,0.2)]"
              : "border-cave-ash/60 text-cave-fog bg-transparent hover:border-cave-fog hover:text-cave-light"
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
          className={`flex-1 h-[48px] flex items-center justify-center gap-2 rounded-full border-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-all disabled:opacity-50 font-[family-name:var(--font-space-mono)] ${
            goingSolo
              ? "border-[#FFFFFF] text-cave-black bg-[#FFFFFF] shadow-[0_0_16px_rgba(255,255,255,0.2)]"
              : "border-cave-ash/60 text-cave-fog bg-transparent hover:border-cave-fog hover:text-cave-light"
          }`}
          aria-pressed={goingSolo}
          aria-label={goingSolo ? "Voy solo — tocar para cambiar" : "Marcar que voy solo"}
        >
          <PersonIcon />
          {goingSolo ? "Solo ✓" : "Voy solo"}
        </motion.button>
      </div>

      {/* Counter — prominent when attendees exist, subtle placeholder otherwise */}
      <div className="flex items-center justify-center gap-1.5 min-h-[16px]">
        {(total > 0 || solo > 0) ? (
          <p className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)] tracking-[0.12em]">
            <span className="text-cave-light font-bold">{total}</span>
            {" "}{total === 1 ? "va" : "van"}
            {solo > 0 && (
              <>
                {" · "}
                <span className="text-cave-light font-bold">{solo}</span>
                {" "}{solo === 1 ? "solo" : "solos"}
              </>
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
