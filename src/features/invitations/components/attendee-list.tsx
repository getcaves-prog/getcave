"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getEventAttendees } from "../services/invitation.service";
import { QrScannerModal } from "./qr-scanner-modal";
import type { QrInvite } from "../types/invitation.types";

interface AttendeeListProps {
  flyerId: string;
  flyerTitle: string | null;
}

export function AttendeeList({ flyerId, flyerTitle }: AttendeeListProps) {
  const [attendees, setAttendees] = useState<QrInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getEventAttendees(flyerId);
      setAttendees(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [flyerId]);

  const checkedIn = attendees.filter((a) => a.checked_in).length;

  return (
    <>
      <div className="rounded-xl border border-cave-ash bg-cave-stone overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cave-ash/60">
          <div>
            <p className="text-[10px] text-cave-fog uppercase tracking-widest font-[family-name:var(--font-space-mono)]">
              Asistentes
            </p>
            <p className="text-xs text-cave-white mt-0.5 font-[family-name:var(--font-space-mono)]">
              {flyerTitle ?? "Evento"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="text-right">
              <p className="text-lg font-bold text-neon-green font-[family-name:var(--font-space-mono)] leading-none">
                {checkedIn}
              </p>
              <p className="text-[9px] text-cave-fog font-[family-name:var(--font-space-mono)]">
                / {attendees.length} ingresaron
              </p>
            </div>
            {/* Scan button */}
            <button
              onClick={() => setShowScanner(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-neon-green text-cave-black"
              aria-label="Escanear QR"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" />
                <rect x="3" y="16" width="5" height="5" rx="1" />
                <path d="M21 16h-3a2 2 0 0 0-2 2v3" /><line x1="21" y1="21" x2="21" y2="21" />
                <line x1="12" y1="3" x2="12" y2="7" /><line x1="12" y1="12" x2="12" y2="12" />
                <line x1="3" y1="12" x2="7" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-cave-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : attendees.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
              Nadie generó su QR todavía.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-cave-ash/40">
            {attendees.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-cave-white truncate">{a.display_name}</p>
                  {a.phone && (
                    <p className="text-[10px] text-cave-fog mt-0.5">{a.phone}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {a.checked_in ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-[9px] text-neon-green font-[family-name:var(--font-space-mono)] uppercase tracking-wider">
                      <span className="w-1 h-1 rounded-full bg-neon-green" />
                      Entró
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-cave-ash text-[9px] text-cave-fog font-[family-name:var(--font-space-mono)] uppercase tracking-wider">
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scanner modal */}
      <AnimatePresence>
        {showScanner && (
          <QrScannerModal onClose={() => { setShowScanner(false); load(); }} />
        )}
      </AnimatePresence>
    </>
  );
}
