import { NextResponse } from "next/server";
import { filterByLocation } from "@/features/discover/services/apify.service";
import {
  aggregateEvents,
  hasEnabledProvider,
} from "@/features/discover/services/aggregate.service";
import {
  getCached,
  setCached,
  makeCacheKey,
} from "@/features/discover/services/cache";
import type { ScrapedFlyer } from "@/features/discover/types/discover.types";

// Provider calls (Apify run-sync, Ticketmaster) can take tens of seconds — must
// run on Node, not edge.
export const runtime = "nodejs";

const MAX_QUERY_LEN = 200;

interface DiscoverResponse {
  events: ScrapedFlyer[];
  cached: boolean;
  source: "providers" | "off";
  /**
   * Whether the returned events are filtered to the user's location.
   * `false` signals a fallback: nothing matched the location filter, so we
   * returned the raw (nearest/related) set instead of a blank result.
   */
  localized: boolean;
}

/**
 * Apply the location filter with graceful fallback: when the filter drops
 * everything but there were raw events, return the raw set (`localized:false`)
 * so the user sees related events instead of a blank "Sin resultados".
 */
function localizeOrFallback(
  raw: ScrapedFlyer[],
  filter: { city?: string; lat?: number; lng?: number }
): { events: ScrapedFlyer[]; localized: boolean } {
  const filtered = filterByLocation(raw, filter);
  if (filtered.length > 0) return { events: filtered, localized: true };
  if (raw.length > 0) return { events: raw, localized: false };
  return { events: [], localized: true };
}

/** Best-effort discovery: always 200, never throws to the client. */
export async function POST(request: Request): Promise<NextResponse> {
  const off: DiscoverResponse = {
    events: [],
    cached: false,
    source: "off",
    localized: true,
  };

  let query = "";
  let city: string | undefined;
  let lat: number | undefined;
  let lng: number | undefined;

  try {
    const body = (await request.json()) as {
      query?: unknown;
      city?: unknown;
      lat?: unknown;
      lng?: unknown;
    };
    query = typeof body.query === "string" ? body.query.trim() : "";
    city = typeof body.city === "string" ? body.city.trim() : undefined;
    lat = typeof body.lat === "number" && Number.isFinite(body.lat)
      ? body.lat
      : undefined;
    lng = typeof body.lng === "number" && Number.isFinite(body.lng)
      ? body.lng
      : undefined;
  } catch {
    // Malformed JSON -> empty (off) response, never 500.
    return NextResponse.json(off);
  }

  // Validate the query: non-empty after trim, within max length.
  if (!query || query.length > MAX_QUERY_LEN) {
    return NextResponse.json({
      events: [],
      cached: false,
      source: hasEnabledProvider() ? "providers" : "off",
      localized: true,
    } satisfies DiscoverResponse);
  }

  // Feature off when no provider is configured (no Apify token, no TM key, …).
  if (!hasEnabledProvider()) {
    return NextResponse.json(off);
  }

  const key = makeCacheKey(query, city);

  // Cache hit -> avoid re-fetching (provider runs cost money / burn quota). The
  // cache holds the RAW (unfiltered) set so users near different points reuse it;
  // the location filter runs per-request below.
  const cached = getCached(key);
  if (cached) {
    const { events, localized } = localizeOrFallback(cached, { city, lat, lng });
    return NextResponse.json({
      events,
      cached: true,
      source: "providers",
      localized,
    } satisfies DiscoverResponse);
  }

  try {
    // RAW fetch from all providers (no coords) — cached, then filtered per-request.
    const raw = await aggregateEvents({ query, city });
    setCached(key, raw);
    const { events, localized } = localizeOrFallback(raw, { city, lat, lng });
    return NextResponse.json({
      events,
      cached: false,
      source: "providers",
      localized,
    } satisfies DiscoverResponse);
  } catch {
    // Provider outage -> still 200 with empty events, NOT cached (retry later).
    return NextResponse.json({
      events: [],
      cached: false,
      source: "providers",
      localized: true,
    } satisfies DiscoverResponse);
  }
}
