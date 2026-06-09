"use client";

interface StatTile {
  value: string | number;
  label: string;
}

interface ProfileStatsRowProps {
  eventsAttended: number;
  communitiesActive: number;
  monthsExploring: number;
  /** Saved flyers count — own profile only (private). Omit to hide the tile. */
  saved?: number;
}

// ─── Stats row — 4 sober tiles (Space Mono numbers, small labels) ────────────
// On public profiles, omit `saved` to drop the private tile (renders 3 tiles).
export function ProfileStatsRow({
  eventsAttended,
  communitiesActive,
  monthsExploring,
  saved,
}: ProfileStatsRowProps) {
  const tiles: StatTile[] = [
    { value: eventsAttended, label: "eventos asistidos" },
    { value: communitiesActive, label: "comunidades activas" },
    { value: monthsExploring, label: "meses explorando" },
  ];

  if (saved !== undefined) {
    tiles.push({ value: `🔖 ${saved}`, label: "guardados" });
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex flex-col items-center justify-center rounded-xl border border-cave-ash/50 bg-cave-stone px-3 py-4 text-center"
        >
          <span className="text-xl text-cave-white font-[family-name:var(--font-space-mono)] font-bold tracking-tight">
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
