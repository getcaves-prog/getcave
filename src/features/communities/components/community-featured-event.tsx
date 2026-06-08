"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getAttendance } from "@/features/canvas/services/attendance.service";
import {
  getFlyerSaveCount,
  isFlyerSaved,
  toggleSaveFlyer,
} from "@/features/canvas/services/favorites.service";
import type { Flyer } from "../types/community.types";

interface CommunityFeaturedEventProps {
  event: Flyer;
  /** Whether the viewer is authenticated — gates the bookmark toggle. */
  isAuthenticated: boolean;
  onSignInRequest: () => void;
}

// ─── PRÓXIMO EVENTO — featured event card ────────────────────────────────────
// Big image, title/date/address/time, and the three metrics:
//   interesados (saves) · van (attendance total) · van solo (attendance solo).
// Bookmark toggles the saved state. "Ver evento" links to the flyer detail.
export function CommunityFeaturedEvent({
  event,
  isAuthenticated,
  onSignInRequest,
}: CommunityFeaturedEventProps) {
  const prefersReducedMotion = useReducedMotion();

  const [saveCount, setSaveCount] = useState(0);
  const [attendanceTotal, setAttendanceTotal] = useState(0);
  const [attendanceSolo, setAttendanceSolo] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [count, attendance, mine] = await Promise.all([
          getFlyerSaveCount(event.id),
          getAttendance(event.id),
          isAuthenticated ? isFlyerSaved(event.id) : Promise.resolve(false),
        ]);
        if (cancelled) return;
        setSaveCount(count);
        setAttendanceTotal(attendance.counts.total);
        setAttendanceSolo(attendance.counts.solo);
        setSaved(mine);
      } catch {
        // Metrics are non-critical — keep zeros on failure.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id, isAuthenticated]);

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      onSignInRequest();
      return;
    }
    if (saving) return;
    setSaving(true);
    // Optimistic update
    const next = !saved;
    setSaved(next);
    setSaveCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const result = await toggleSaveFlyer(event.id);
      setSaved(result);
    } catch {
      // Revert on failure
      setSaved(!next);
      setSaveCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = event.event_date
    ? new Date(event.event_date + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <section className="bg-cave-rock border border-cave-ash/50 rounded-2xl overflow-hidden">
      {/* Header label */}
      <div className="px-5 pt-5">
        <span className="border-l-2 border-cave-white/50 pl-2.5 text-[10px] uppercase tracking-[0.2em] text-cave-fog font-[family-name:var(--font-space-mono)]">
          Próximo evento
        </span>
      </div>

      {/* Big image */}
      <Link href={`/flyer/${event.id}`} className="block relative w-full aspect-[16/10] mt-4">
        {event.image_url && (
          <Image
            src={event.image_url}
            alt={event.title ?? "Evento"}
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover"
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-cave-rock via-transparent to-transparent" />
        {/* Bookmark */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleToggleSave();
          }}
          disabled={saving}
          aria-label={saved ? "Quitar de interesados" : "Marcar interés"}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-cave-black/70 backdrop-blur-sm border border-cave-ash/50 flex items-center justify-center text-cave-white disabled:opacity-50"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </Link>

      {/* Body */}
      <div className="px-5 pb-5 pt-4">
        {event.title && (
          <h3 className="text-lg font-bold text-cave-white font-[family-name:var(--font-space-mono)] leading-tight mb-2">
            {event.title}
          </h3>
        )}

        <div className="flex flex-col gap-1.5 mb-4">
          {dateLabel && (
            <p className="flex items-center gap-2 text-xs text-cave-light font-[family-name:var(--font-inter)] capitalize">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cave-fog flex-shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {dateLabel}
              {event.event_time && (
                <span className="text-cave-fog">· {event.event_time.slice(0, 5)}</span>
              )}
            </p>
          )}
          {event.address && (
            <p className="flex items-center gap-2 text-xs text-cave-fog font-[family-name:var(--font-inter)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{event.address}</span>
            </p>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Metric
            label="interesados"
            value={saveCount}
            icon={
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            }
          />
          <Metric
            label="van"
            value={attendanceTotal}
            icon={
              <>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </>
            }
          />
          <Metric
            label="van solo"
            value={attendanceSolo}
            icon={
              <>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </>
            }
          />
        </div>

        <motion.div whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}>
          <Link
            href={`/flyer/${event.id}`}
            className="w-full h-[44px] rounded-full border border-cave-white/40 text-cave-white font-bold uppercase tracking-[0.12em] text-xs font-[family-name:var(--font-space-mono)] flex items-center justify-center gap-2 hover:bg-cave-white/5 transition-colors"
          >
            Ver evento
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Metric chip ─────────────────────────────────────────────────────────────
function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-cave-stone/60 border border-cave-ash/30">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cave-fog">
        {icon}
      </svg>
      <span className="text-base font-bold text-cave-white font-[family-name:var(--font-space-mono)] leading-none">
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-[0.1em] text-cave-smoke font-[family-name:var(--font-space-mono)]">
        {label}
      </span>
    </div>
  );
}
