"use client";

interface StatTile {
  value: string | number;
  label: string;
  bookmark?: boolean;
}

interface ProfileStatsRowProps {
  eventsAttended: number;
  communitiesActive: number;
  monthsExploring: number;
  /** Saved flyers count — own profile only (private). Omit to hide the tile. */
  saved?: number;
}

// ─── Stats row — flat row of 4 (big white number, small mono label) ──────────
// No card backgrounds: just numbers + labels separated by thin dividers.
// On public profiles, omit `saved` to drop the private tile (renders 3 items).
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
    tiles.push({ value: saved, label: "guardados", bookmark: true });
  }

  return (
    <div className="flex items-stretch">
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className={`flex flex-1 flex-col items-center justify-start px-1.5 text-center sm:px-3 ${
            i > 0 ? "border-l border-cave-ash/50" : ""
          }`}
        >
          <span className="flex items-center gap-1 text-2xl text-cave-white font-[family-name:var(--font-space-mono)] font-bold tracking-tight">
            {tile.bookmark && (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-cave-fog"
                aria-hidden="true"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            )}
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
