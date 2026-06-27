// Server-only: reads APIFY_* secrets from process.env (never NEXT_PUBLIC_*).
// Must only be imported from server code (the discover-events route handler).
import { expandQuery } from "@/features/discover/services/expand-query";
import { enrichFlyersWithGemini } from "@/features/discover/services/gemini.service";
import { haversineKm } from "@/features/discover/services/haversine";
import { normalizeApifyEvent } from "@/features/discover/services/normalize";
import type {
  ScrapedFlyer,
  ScrapedSource,
} from "@/features/discover/types/discover.types";

const APIFY_BASE = "https://api.apify.com/v2/acts";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RESULTS = 40;
const MAX_ITEMS_PER_ACTOR = 30;
/** Cap on distinct IG hashtags sent in a single run (matches query expansion). */
const MAX_HASHTAGS = 4;

/** Default attendable radius (km) for the location filter. */
export const DEFAULT_RADIUS_KM = 80;

interface RunOpts {
  timeoutMs?: number;
}

/**
 * Run a single Apify actor synchronously and return its dataset items.
 *
 * Calls the `run-sync-get-dataset-items` endpoint, which blocks until the run
 * finishes and returns the items array directly. Uses an AbortController so a
 * hung run can't block the request forever.
 *
 * NEVER throws — on missing token, timeout, network error, non-2xx, or a
 * non-array body it returns `[]`. Discovery is best-effort.
 */
export async function runApifyActor(
  actorId: string,
  input: object,
  opts: RunOpts = {}
): Promise<unknown[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${APIFY_BASE}/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(
      token
    )}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export interface ScrapeEventsParams {
  query: string;
  city?: string;
  /** User latitude — when present (with lng), enables the location filter. */
  lat?: number;
  /** User longitude — when present (with lat), enables the location filter. */
  lng?: number;
}

/**
 * Normalize a free-text query into a single Instagram hashtag token:
 * lowercase, strip accents (NFD), remove every non-alphanumeric char (this also
 * removes spaces and a leading '#'). Returns "" when nothing usable remains.
 */
export function toHashtag(query: string): string {
  return query
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritic marks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // drop spaces, '#', punctuation
}

/**
 * Scrape events from Facebook + Instagram via Apify and normalize them into the
 * canvas flyer shape.
 *
 * Reads APIFY_TOKEN, APIFY_FB_ACTOR_ID, APIFY_IG_ACTOR_ID from the environment.
 * When the token is missing the feature is simply off (returns []).
 *
 * Per-platform input shapes (confirmed via live Apify runs):
 *   - Facebook  → apify/facebook-events-scraper:
 *       { searchQueries: ["<query city>"], maxEvents: 30 }
 *       (uses SEARCH QUERIES — free text = user query + city)
 *   - Instagram → apify/instagram-hashtag-scraper:
 *       { hashtags: ["<tag>"], resultsType: "posts", resultsLimit: 30 }
 *       (uses HASHTAGS — the normalized user query via toHashtag())
 */
export async function scrapeEvents({
  query,
  city,
  lat,
  lng,
}: ScrapeEventsParams): Promise<ScrapedFlyer[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  const fbActor = process.env.APIFY_FB_ACTOR_ID;
  const igActor = process.env.APIFY_IG_ACTOR_ID;

  const jobs: Array<Promise<ScrapedFlyer[]>> = [];

  // Broaden coverage: expand the query into a few related terms (original first)
  // so one run hits nearby concepts (e.g. "salsa" → also "baile", "bachata").
  const terms = expandQuery(query);

  if (fbActor) {
    // Facebook events scraper: free-text search = "<term> <city>" per term.
    // The actor accepts an ARRAY → ONE run, broader coverage.
    const searchQueries = terms.map((t) =>
      [t, city].filter(Boolean).join(" ").trim()
    );
    const fbInput = {
      searchQueries,
      maxEvents: MAX_ITEMS_PER_ACTOR,
    };
    jobs.push(runAndNormalize(fbActor, fbInput, "facebook"));
  }

  if (igActor) {
    // Instagram hashtag scraper: localize by folding the city INTO each hashtag
    // (e.g. "techno" + "monterrey" → "technomonterrey") so we get local posts
    // instead of global noise. One hashtag per expanded term, deduped and capped
    // — multiple hashtags in ONE run.
    const seen = new Set<string>();
    const hashtags: string[] = [];
    for (const t of terms) {
      const tag = toHashtag([t, city].filter(Boolean).join(" "));
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      hashtags.push(tag);
      if (hashtags.length >= MAX_HASHTAGS) break;
    }
    if (hashtags.length > 0) {
      const igInput = {
        hashtags,
        resultsType: "posts",
        resultsLimit: MAX_ITEMS_PER_ACTOR,
      };
      jobs.push(runAndNormalize(igActor, igInput, "instagram"));
    }
  }

  const settled = await Promise.allSettled(jobs);

  const flyers: ScrapedFlyer[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      flyers.push(...outcome.value);
    }
  }

  const deduped = dedupeById(flyers).slice(0, MAX_RESULTS);

  // V2: structure noisy captions (esp. Instagram) via Gemini. One batch call per
  // search; graceful — on missing key/error it returns `deduped` unchanged. The
  // query+city cache upstream means this won't re-run for cached queries.
  const enriched = await enrichFlyersWithGemini(deduped);

  // V4: drop events that already happened (only show CURRENT/upcoming). Unknown
  // or unparseable dates are kept — we never over-drop IG posts without a clear
  // date. Applied before the location filter.
  const fresh = filterFreshness(enriched);

  // V3: keep only events near the user. Graceful — with no user coords we do not
  // filter at all (preserving the global behavior). Runs per-request so the same
  // raw scrape can be reused for users near different points.
  return filterByLocation(fresh, { city, lat, lng });
}

/** Format a Date as a date-only YYYY-MM-DD string (UTC). */
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Keep only CURRENT events: drop a flyer when its `event_date` is a valid date
 * strictly BEFORE today (the event already happened). Comparison is date-only
 * (YYYY-MM-DD lexical compare, which is correct for ISO dates).
 *
 * Unknown or unparseable `event_date` → KEPT (we don't over-drop IG posts that
 * lack a clear date). `now` is injectable for deterministic tests.
 */
export function filterFreshness(
  flyers: ScrapedFlyer[],
  now: Date = new Date()
): ScrapedFlyer[] {
  const today = toDateKey(now);

  return flyers.filter((flyer) => {
    const raw = flyer.event_date;
    if (!raw) return true; // unknown date stays

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return true; // unparseable stays

    // Date-only compare: drop strictly-past events, keep today and future.
    return raw.slice(0, 10) >= today;
  });
}

/** User context for the location filter. */
interface LocationFilter {
  city?: string;
  lat?: number;
  lng?: number;
}

/**
 * Drop scraped events that are clearly NOT near the user. Two signals:
 *   1. Coordinates (FB): keep iff Haversine distance ≤ DEFAULT_RADIUS_KM.
 *   2. City (IG via Gemini): if the flyer has a detected city AND the user's
 *      city is known, keep iff the cities match (accent/case-insensitive,
 *      contains either direction). Uncertain (no coords, no detected city) is
 *      always KEPT — we never over-filter.
 *
 * When the user's coordinates are absent the filter is a NO-OP (global behavior).
 */
export function filterByLocation(
  flyers: ScrapedFlyer[],
  { city, lat, lng }: LocationFilter
): ScrapedFlyer[] {
  if (typeof lat !== "number" || typeof lng !== "number") return flyers;

  const userCity = normalizeCity(city);

  return flyers.filter((flyer) => {
    // Strongest signal: real coordinates.
    if (typeof flyer._lat === "number" && typeof flyer._lng === "number") {
      return haversineKm(lat, lng, flyer._lat, flyer._lng) <= DEFAULT_RADIUS_KM;
    }

    // Weaker signal: a Gemini-detected city. Only filters when BOTH are known.
    const flyerCity = normalizeCity(flyer._city);
    if (flyerCity && userCity) {
      return flyerCity.includes(userCity) || userCity.includes(flyerCity);
    }

    // Uncertain → keep.
    return true;
  });
}

/** Lowercase + strip accents for forgiving city comparisons; "" when empty. */
function normalizeCity(value: string | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

async function runAndNormalize(
  actorId: string,
  input: object,
  source: ScrapedSource
): Promise<ScrapedFlyer[]> {
  const items = await runApifyActor(actorId, input);
  const normalized: ScrapedFlyer[] = [];
  for (const item of items) {
    const flyer = normalizeApifyEvent(item, source);
    if (flyer) normalized.push(flyer);
  }
  return normalized;
}

function dedupeById(flyers: ScrapedFlyer[]): ScrapedFlyer[] {
  const seen = new Set<string>();
  const result: ScrapedFlyer[] = [];
  for (const flyer of flyers) {
    if (seen.has(flyer.id)) continue;
    seen.add(flyer.id);
    result.push(flyer);
  }
  return result;
}
