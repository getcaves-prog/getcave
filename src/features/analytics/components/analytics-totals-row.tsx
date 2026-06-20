"use client";

import type { CreatorAnalyticsTotals } from "@/features/analytics/types/analytics.types";

interface AnalyticsTotalsRowProps {
  totals: CreatorAnalyticsTotals;
}

// ─── Totals row — flat row of 4 (big white number, small mono label) ─────────
// Mirrors profile-stats-row: no card backgrounds, thin dividers between tiles.
export function AnalyticsTotalsRow({ totals }: AnalyticsTotalsRowProps) {
  const tiles = [
    { value: totals.flyers, label: "flyers publicados" },
    { value: totals.views, label: "vistas" },
    { value: totals.attendees, label: "asistentes" },
    { value: totals.saves, label: "guardados" },
  ];

  return (
    <div className="flex items-stretch">
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className={`flex flex-1 flex-col items-center justify-start px-1.5 text-center sm:px-3 ${
            i > 0 ? "border-l border-cave-ash/50" : ""
          }`}
        >
          <span className="text-2xl text-cave-white font-[family-name:var(--font-space-mono)] font-bold tracking-tight">
            {tile.value}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.1em] text-cave-smoke font-[family-name:var(--font-space-mono)] leading-tight">
            {tile.label}
          </span>
        </div>
      ))}
    </div>
  );
}
