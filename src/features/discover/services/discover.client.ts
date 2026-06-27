import type { ScrapedFlyer } from "../types/discover.types";

/** Optional user coordinates threaded into the scraped location filter. */
export interface DiscoverCoords {
  lat: number;
  lng: number;
}

/**
 * Client-side caller for the discovery endpoint. POSTs `{ query, city, lat, lng }`
 * to `/api/discover-events` and returns the scraped events. When `coords` are
 * provided the server filters out events that are not near the user. Best-effort:
 * any non-ok response, network error, or malformed body resolves to `[]`.
 */
export async function discoverEvents(
  query: string,
  city?: string,
  coords?: DiscoverCoords
): Promise<ScrapedFlyer[]> {
  const clean = query.trim();
  if (!clean) return [];

  try {
    const res = await fetch("/api/discover-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: clean,
        city: city?.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      }),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { events?: unknown };
    return Array.isArray(data.events) ? (data.events as ScrapedFlyer[]) : [];
  } catch {
    return [];
  }
}
