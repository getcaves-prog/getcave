"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { MyEvent, MyEventsResult } from "../types/activity.types";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "Fecha por confirmar";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Event card ────────────────────────────────────────────────────────────

function EventCard({ event }: { event: MyEvent }) {
  return (
    <Link
      href={`/flyer/${event.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cave-stone/60 border border-cave-ash/40 hover:border-cave-ash/70 active:scale-[0.98] transition-all"
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-[68px] rounded-lg overflow-hidden bg-cave-ash flex-shrink-0">
        <Image
          src={event.image_url}
          alt={event.title ?? "Evento"}
          fill
          sizes="48px"
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cave-white font-medium truncate mb-0.5">
          {event.title ?? "Evento sin título"}
        </p>
        <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] mb-1">
          {formatEventDate(event.event_date)}
        </p>
        <div className="flex items-center gap-2">
          {event.going_solo && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-[family-name:var(--font-space-mono)] bg-cave-fog/15 text-cave-fog uppercase tracking-wide">
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Voy solo
            </span>
          )}
          {event.address && (
            <span className="text-[10px] text-cave-smoke truncate flex items-center gap-0.5">
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {event.address}
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-cave-ash flex-shrink-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyEventsState({ bucket }: { bucket: "upcoming" | "past" }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-cave-stone flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cave-smoke"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <p className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)]">
        {bucket === "upcoming"
          ? "No tenés eventos próximos"
          : "No fuiste a ningún evento todavía"}
      </p>
      <p className="text-xs text-cave-smoke">
        {bucket === "upcoming"
          ? "Explorá el feed y confirmá tu asistencia"
          : "Tus eventos pasados aparecerán acá"}
      </p>
    </div>
  );
}

// ─── Sub-tabs ──────────────────────────────────────────────────────────────

type EventBucket = "upcoming" | "past";

// ─── Public export ─────────────────────────────────────────────────────────

interface MyEventsListProps {
  events: MyEventsResult;
  loading?: boolean;
}

export function MyEventsList({ events, loading }: MyEventsListProps) {
  const [bucket, setBucket] = useState<EventBucket>("upcoming");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cave-fog border-t-[#39FF14] rounded-full animate-spin" />
      </div>
    );
  }

  const displayList: MyEvent[] = bucket === "upcoming" ? events.upcoming : events.past;

  return (
    <div className="pb-8">
      {/* Sub-tab switcher */}
      <div className="flex items-center gap-0 mx-4 mb-4 rounded-lg overflow-hidden border border-cave-ash/40 self-start w-fit">
        <button
          onClick={() => setBucket("upcoming")}
          className={`
            flex items-center gap-1.5 px-4 py-2 text-xs font-[family-name:var(--font-space-mono)] transition-colors
            ${bucket === "upcoming" ? "bg-[#39FF14]/15 text-[#39FF14]" : "text-cave-smoke hover:text-cave-fog"}
          `}
        >
          Próximos
          {events.upcoming.length > 0 && (
            <span className={`text-[10px] px-1 py-0.5 rounded ${bucket === "upcoming" ? "bg-[#39FF14]/20 text-[#39FF14]" : "bg-cave-ash/40 text-cave-smoke"}`}>
              {events.upcoming.length}
            </span>
          )}
        </button>
        <div className="w-px h-6 bg-cave-ash/40" />
        <button
          onClick={() => setBucket("past")}
          className={`
            flex items-center gap-1.5 px-4 py-2 text-xs font-[family-name:var(--font-space-mono)] transition-colors
            ${bucket === "past" ? "bg-cave-fog/10 text-cave-fog" : "text-cave-smoke hover:text-cave-fog"}
          `}
        >
          Pasados
          {events.past.length > 0 && (
            <span className={`text-[10px] px-1 py-0.5 rounded ${bucket === "past" ? "bg-cave-fog/20 text-cave-fog" : "bg-cave-ash/40 text-cave-smoke"}`}>
              {events.past.length}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      {displayList.length === 0 ? (
        <EmptyEventsState bucket={bucket} />
      ) : (
        <div className="flex flex-col gap-2 px-4">
          {displayList.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
