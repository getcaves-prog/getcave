// Server-only: reads APIFY_* secrets from process.env (never NEXT_PUBLIC_*).
// Must only be imported from server code (the discover-events route handler).
import { enrichFlyersWithGemini } from "@/features/discover/services/gemini.service";
import { normalizeApifyEvent } from "@/features/discover/services/normalize";
import type {
  ScrapedFlyer,
  ScrapedSource,
} from "@/features/discover/types/discover.types";

const APIFY_BASE = "https://api.apify.com/v2/acts";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RESULTS = 40;
const MAX_ITEMS_PER_ACTOR = 30;

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
}: ScrapeEventsParams): Promise<ScrapedFlyer[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  const fbActor = process.env.APIFY_FB_ACTOR_ID;
  const igActor = process.env.APIFY_IG_ACTOR_ID;

  const jobs: Array<Promise<ScrapedFlyer[]>> = [];

  if (fbActor) {
    // Facebook events scraper: free-text search = "<query> <city>".
    const searchText = [query, city].filter(Boolean).join(" ").trim();
    const fbInput = {
      searchQueries: [searchText],
      maxEvents: MAX_ITEMS_PER_ACTOR,
    };
    jobs.push(runAndNormalize(fbActor, fbInput, "facebook"));
  }

  if (igActor) {
    // Instagram hashtag scraper: localize by folding the city INTO the hashtag
    // (e.g. "techno" + "monterrey" → "technomonterrey") so we get local posts
    // instead of global #techno noise. With a city we use ONLY the local tag;
    // without a city we fall back to the bare query tag.
    const localHashtag = toHashtag([query, city].filter(Boolean).join(" "));
    const hashtags = (
      city ? [localHashtag] : [toHashtag(query)]
    ).filter(Boolean) as string[];
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
  return enrichFlyersWithGemini(deduped);
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
