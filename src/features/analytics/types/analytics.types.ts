// ─── Creator analytics types ────────────────────────────────────────────────

export interface FlyerAnalytics {
  id: string;
  /** Flyer title — may be null; the UI shows an "Evento" fallback. */
  title: string | null;
  image_url: string;
  /** ISO date string or null when the flyer has no event date. */
  event_date: string | null;
  views: number;
  attendees: number;
  soloAttendees: number;
  saves: number;
}

export interface CreatorAnalyticsTotals {
  flyers: number;
  views: number;
  attendees: number;
  saves: number;
}

export interface CreatorAnalytics {
  totals: CreatorAnalyticsTotals;
  flyers: FlyerAnalytics[];
}
