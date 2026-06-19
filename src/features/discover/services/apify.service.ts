// Server-only: reads APIFY_* secrets from process.env (never NEXT_PUBLIC_*).
// Must only be imported from server code (the discover-events route handler).
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
 * Scrape events from Facebook + Instagram via Apify and normalize them into the
 * canvas flyer shape.
 *
 * Reads APIFY_TOKEN, APIFY_FB_ACTOR_ID, APIFY_IG_ACTOR_ID from the environment.
 * When the token is missing the feature is simply off (returns []).
 *
 * NOTE: The exact `input` keys an actor expects depend on the chosen Apify
 * actor. The shape below (`search` / `location` / `maxItems`) is generic; adjust
 * it to match the actors you configure via APIFY_FB_ACTOR_ID / APIFY_IG_ACTOR_ID.
 */
export async function scrapeEvents({
  query,
  city,
}: ScrapeEventsParams): Promise<ScrapedFlyer[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  const fbActor = process.env.APIFY_FB_ACTOR_ID;
  const igActor = process.env.APIFY_IG_ACTOR_ID;

  // Generic actor input — keys depend on the chosen actor (see NOTE above).
  const input = {
    search: query,
    location: city ?? "",
    maxItems: MAX_ITEMS_PER_ACTOR,
  };

  const jobs: Array<Promise<ScrapedFlyer[]>> = [];
  if (fbActor) jobs.push(runAndNormalize(fbActor, input, "facebook"));
  if (igActor) jobs.push(runAndNormalize(igActor, input, "instagram"));

  const settled = await Promise.allSettled(jobs);

  const flyers: ScrapedFlyer[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      flyers.push(...outcome.value);
    }
  }

  return dedupeById(flyers).slice(0, MAX_RESULTS);
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
