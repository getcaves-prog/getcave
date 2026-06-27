"use client";

import { useEffect, useState } from "react";
import { CaveFlyerCard } from "./cave-flyer-card";
import {
  getRecentFlyers,
  type RecentFlyer,
} from "../services/recent-flyers.service";

const MONTHS_ES = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

const DAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/** "2026-05-19" → "19 MAY" (parsed as a date-only, timezone-safe). */
function toDateLabel(eventDate: string | null): string | null {
  if (!eventDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(eventDate);
  if (!match) return null;
  const [, , month, day] = match;
  return `${Number(day)} ${MONTHS_ES[Number(month) - 1] ?? ""}`.trim();
}

/** "2026-05-19" → "Domingo". */
function toDayLabel(eventDate: string | null): string | null {
  if (!eventDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(eventDate);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return DAYS_ES[date.getDay()] ?? null;
}

export function CavesCarousel() {
  const [flyers, setFlyers] = useState<RecentFlyer[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getRecentFlyers(6).then((data) => {
      if (active) {
        setFlyers(data);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Hide the whole section gracefully when there's nothing to show.
  if (loaded && flyers.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-5">
        <h2 className="mb-8 text-center font-[family-name:var(--font-space-mono)] text-xs uppercase tracking-[0.3em] text-cave-fog">
          En CAVES se ve así
        </h2>
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide">
        {flyers.map((flyer) => (
          <div key={flyer.id} className="w-[200px] shrink-0 snap-start">
            <CaveFlyerCard
              imageUrl={flyer.image_url}
              title={flyer.title ?? "Evento"}
              dateLabel={toDateLabel(flyer.event_date)}
              dayLabel={toDayLabel(flyer.event_date)}
              timeLabel={flyer.event_time}
              place={flyer.address}
              href={`/flyer/${flyer.id}`}
              variant="card"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
