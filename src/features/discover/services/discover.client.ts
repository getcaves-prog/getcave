import type { ScrapedFlyer } from "../types/discover.types";

/**
 * Client-side caller for the discovery endpoint. POSTs `{ query, city }` to
 * `/api/discover-events` and returns the scraped events. Best-effort: any
 * non-ok response, network error, or malformed body resolves to `[]` so the
 * caller can merge an empty list without special-casing failures.
 */
export async function discoverEvents(
  query: string,
  city?: string
): Promise<ScrapedFlyer[]> {
  const clean = query.trim();
  if (!clean) return [];

  try {
    const res = await fetch("/api/discover-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: clean, city: city?.trim() || undefined }),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { events?: unknown };
    return Array.isArray(data.events) ? (data.events as ScrapedFlyer[]) : [];
  } catch {
    return [];
  }
}
