"use client";

import Image from "next/image";
import Link from "next/link";
import type { FlyerAnalytics } from "@/features/analytics/types/analytics.types";

interface FlyerAnalyticsRowProps {
  flyer: FlyerAnalytics;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Per-flyer analytics row ─────────────────────────────────────────────────
// Thumbnail + title/date + a clean metrics line. Tapping opens /flyer/{id}.
export function FlyerAnalyticsRow({ flyer }: FlyerAnalyticsRowProps) {
  const date = formatDate(flyer.event_date);
  const metrics: { icon: string; value: number; label: string }[] = [
    { icon: "👁", value: flyer.views, label: "vistas" },
    { icon: "👥", value: flyer.attendees, label: "asistentes" },
    { icon: "🧍", value: flyer.soloAttendees, label: "solos" },
    { icon: "🔖", value: flyer.saves, label: "guardados" },
  ];

  return (
    <Link
      href={`/flyer/${flyer.id}`}
      className="flex items-center gap-3 rounded-xl border border-cave-ash/50 bg-cave-dark p-3 transition-colors hover:border-cave-smoke"
    >
      {/* Thumbnail */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-cave-ash/60 bg-cave-stone">
        {flyer.image_url ? (
          <Image
            src={flyer.image_url}
            alt={flyer.title ?? "Evento"}
            fill
            sizes="56px"
            className="object-cover"
            unoptimized
          />
        ) : null}
      </div>

      {/* Title + date + metrics */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-cave-white font-[family-name:var(--font-space-mono)] font-bold">
          {flyer.title || "Evento"}
        </p>
        {date && (
          <p className="mt-0.5 text-[11px] text-cave-smoke font-[family-name:var(--font-space-mono)]">
            {date}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {metrics.map((m) => (
            <span
              key={m.label}
              className="flex items-center gap-1 text-[11px] text-cave-fog font-[family-name:var(--font-space-mono)]"
              title={m.label}
            >
              <span aria-hidden="true">{m.icon}</span>
              <span className="text-cave-light font-bold">{m.value}</span>
            </span>
          ))}
        </div>
      </div>

      <span className="text-cave-smoke" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
