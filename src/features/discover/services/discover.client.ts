import type { ScrapedFlyer } from "../types/discover.types";

/** Optional user coordinates threaded into the scraped location filter. */
export interface DiscoverCoords {
  lat: number;
  lng: number;
}

/** Result of a discovery call: the scraped events plus whether they are local. */
export interface DiscoverResult {
  events: ScrapedFlyer[];
  /**
   * `true` when the events match the user's location, `false` when the server
   * fell back to nearest/related events because nothing matched locally.
   * Defaults to `true` for all best-effort empty results.
   */
  localized: boolean;
}

/**
 * Client-side caller for the discovery endpoint. POSTs `{ query, city, lat, lng }`
 * to `/api/discover-events` and returns the scraped events plus a `localized`
 * flag. When `coords` are provided the server filters out events that are not
 * near the user; if that drops everything it falls back to related events with
 * `localized:false`. Best-effort: any non-ok response, network error, or
 * malformed body resolves to `{ events: [], localized: true }`.
 */
export async function discoverEvents(
  query: string,
  city?: string,
  coords?: DiscoverCoords
): Promise<DiscoverResult> {
  const clean = query.trim();
  if (!clean) return { events: [], localized: true };

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

    if (!res.ok) return { events: [], localized: true };

    const data = (await res.json()) as {
      events?: unknown;
      localized?: unknown;
    };
    const events = Array.isArray(data.events)
      ? (data.events as ScrapedFlyer[])
      : [];
    // Default to true when the server omits the flag (back-compat / safe).
    const localized = data.localized === false ? false : true;
    return { events, localized };
  } catch {
    return { events: [], localized: true };
  }
}
