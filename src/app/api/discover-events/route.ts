import { NextResponse } from "next/server";
import {
  filterByLocation,
  scrapeEvents,
} from "@/features/discover/services/apify.service";
import {
  getCached,
  setCached,
  makeCacheKey,
} from "@/features/discover/services/cache";
import type { ScrapedFlyer } from "@/features/discover/types/discover.types";

// Apify run-sync calls can take tens of seconds — must run on Node, not edge.
export const runtime = "nodejs";

const MAX_QUERY_LEN = 200;

interface DiscoverResponse {
  events: ScrapedFlyer[];
  cached: boolean;
  source: "apify" | "off";
}

/** Best-effort discovery: always 200, never throws to the client. */
export async function POST(request: Request): Promise<NextResponse> {
  const off: DiscoverResponse = { events: [], cached: false, source: "off" };

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
    const tokenPresent = Boolean(process.env.APIFY_TOKEN);
    return NextResponse.json({
      events: [],
      cached: false,
      source: tokenPresent ? "apify" : "off",
    } satisfies DiscoverResponse);
  }

  // Feature off when no token configured.
  if (!process.env.APIFY_TOKEN) {
    return NextResponse.json(off);
  }

  const key = makeCacheKey(query, city);

  // Cache hit -> avoid re-scraping (Apify costs money per run). The cache holds
  // the RAW (unfiltered) scrape so users near different points reuse it; the
  // location filter runs per-request below.
  const cached = getCached(key);
  if (cached) {
    return NextResponse.json({
      events: filterByLocation(cached, { city, lat, lng }),
      cached: true,
      source: "apify",
    } satisfies DiscoverResponse);
  }

  try {
    // RAW scrape (no coords) — cached as-is, then filtered per-request.
    const raw = await scrapeEvents({ query, city });
    setCached(key, raw);
    return NextResponse.json({
      events: filterByLocation(raw, { city, lat, lng }),
      cached: false,
      source: "apify",
    } satisfies DiscoverResponse);
  } catch {
    // Scrape failure -> still 200 with empty events.
    return NextResponse.json({
      events: [],
      cached: false,
      source: "apify",
    } satisfies DiscoverResponse);
  }
}
