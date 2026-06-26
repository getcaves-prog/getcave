import { NextResponse } from "next/server";
import { scrapeEvents } from "@/features/discover/services/apify.service";
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

  try {
    const body = (await request.json()) as {
      query?: unknown;
      city?: unknown;
    };
    query = typeof body.query === "string" ? body.query.trim() : "";
    city = typeof body.city === "string" ? body.city.trim() : undefined;
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

  // Cache hit -> avoid re-scraping (Apify costs money per run).
  const cached = getCached(key);
  if (cached) {
    return NextResponse.json({
      events: cached,
      cached: true,
      source: "apify",
    } satisfies DiscoverResponse);
  }

  try {
    const events = await scrapeEvents({ query, city });
    setCached(key, events);
    return NextResponse.json({
      events,
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
