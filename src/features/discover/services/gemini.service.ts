// Server-only: reads GEMINI_* secrets from process.env (never NEXT_PUBLIC_*).
// Must only be imported from server code (the discover scraping pipeline).
//
// Required env vars:
//   GEMINI_API_KEY  — Google Generative Language API key. When absent, enrichment
//                     is simply OFF and flyers pass through unchanged (no fetch).
//   GEMINI_MODEL    — optional, defaults to "gemini-2.5-flash". (gemini-2.0-flash
//                     returned quota 0 on the project key; 2.5-flash works.)
import type { ScrapedFlyer } from "@/features/discover/types/discover.types";

const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_BATCH = 30;

/** One structured event extracted by Gemini, keyed back to the flyer by index. */
interface GeminiEvent {
  index: number;
  title?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  place?: string | null;
  category?: string | null;
}

/**
 * JSON response schema forcing Gemini to emit an ARRAY of structured event
 * objects (one per numbered input text). Combined with
 * responseMimeType=application/json this guarantees parseable output.
 */
const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      index: { type: "INTEGER" },
      title: { type: "STRING", nullable: true },
      event_date: { type: "STRING", nullable: true },
      event_time: { type: "STRING", nullable: true },
      place: { type: "STRING", nullable: true },
      category: { type: "STRING", nullable: true },
    },
    required: ["index"],
  },
} as const;

/**
 * Enrich scraped flyers with Gemini AI structuring (V2).
 *
 * Gemini parses the noisy caption/description text (especially Instagram posts)
 * into structured date/time/place/title far better than the heuristic parser,
 * with a strict graceful fallback: on a missing key, any error, a timeout, or
 * bad JSON it returns the ORIGINAL flyers unchanged and NEVER throws — the
 * heuristic output is always the floor.
 *
 * Strategy:
 *   1. Skip flyers without a `description` (nothing to structure).
 *   2. Cap the batch at MAX_BATCH to keep the prompt bounded.
 *   3. ONE generateContent call with a numbered list of texts + a JSON
 *      responseSchema (ARRAY of OBJECT).
 *   4. Map results back by index and MERGE with precedence:
 *        title      = gemini.title || flyer.title
 *        event_date = gemini.event_date || flyer.event_date
 *        event_time = gemini.event_time || flyer.event_time
 *        address    = gemini.place || flyer.address
 *      A null/empty Gemini value NEVER clobbers an existing good value.
 */
export async function enrichFlyersWithGemini(
  flyers: ScrapedFlyer[]
): Promise<ScrapedFlyer[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return flyers;

  // Indices (into `flyers`) of the items we'll ask Gemini about, capped.
  const batchIndices: number[] = [];
  for (let i = 0; i < flyers.length && batchIndices.length < MAX_BATCH; i++) {
    const desc = flyers[i].description;
    if (typeof desc === "string" && desc.trim().length > 0) {
      batchIndices.push(i);
    }
  }
  if (batchIndices.length === 0) return flyers;

  try {
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const prompt = buildPrompt(batchIndices.map((i) => flyers[i].description!));

    const events = await callGemini(apiKey, model, prompt);
    if (!events) return flyers;

    return mergeEvents(flyers, batchIndices, events);
  } catch {
    // Any unexpected failure → fall back to the heuristic output untouched.
    return flyers;
  }
}

/**
 * Build the batch prompt: an extractor instruction plus a numbered list of the
 * caption texts. Numbers are 1-based for readability; the model is told to
 * return a 0-based `index` matching the list position.
 */
function buildPrompt(texts: string[]): string {
  const numbered = texts
    .map((text, i) => `${i + 1}. ${oneLine(text)}`)
    .join("\n");

  return [
    "You are an event-data extractor for a nightlife/events app.",
    "Below is a numbered list of social-media post texts (mostly Instagram",
    "captions, often noisy with emojis and hashtags). For EACH item, extract",
    "the event details. Return a JSON array; one object per input item with:",
    '  - index: the 0-based position (item 1 -> 0, item 2 -> 1, ...)',
    "  - title: a short clean event title, or null",
    "  - event_date: the event date as YYYY-MM-DD, or null if not stated",
    "  - event_time: the start time (e.g. 22:00), or null",
    "  - place: the venue/place name, or null",
    "  - category: a one-word category (music, party, art, food...), or null",
    "Use null for anything not clearly present. Do NOT invent dates.",
    "",
    "Posts:",
    numbered,
  ].join("\n");
}

/** Collapse whitespace/newlines so each caption is a single prompt line. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Single generateContent call with a 30s AbortController timeout. Returns the
 * parsed event array, or null on any non-2xx / bad-shape / unparseable result.
 */
async function callGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<GeminiEvent[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = extractText(data);
    if (!text) return null;

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as GeminiEvent[]) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull candidates[0].content.parts[0].text out of a generateContent body. */
function extractText(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const candidates = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content
    ?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const text = (parts[0] as { text?: unknown })?.text;
  return typeof text === "string" ? text : null;
}

/**
 * Merge Gemini events back into the flyers. `batchIndices[k]` is the flyer index
 * that prompt item k (0-based) refers to. Out-of-range / unmatched Gemini items
 * are ignored. Returns a new array; untouched flyers keep their reference.
 */
function mergeEvents(
  flyers: ScrapedFlyer[],
  batchIndices: number[],
  events: GeminiEvent[]
): ScrapedFlyer[] {
  const result = [...flyers];

  for (const event of events) {
    if (typeof event?.index !== "number") continue;
    const flyerIndex = batchIndices[event.index];
    if (flyerIndex === undefined) continue;

    const current = result[flyerIndex];
    result[flyerIndex] = {
      ...current,
      title: clean(event.title) ?? current.title,
      event_date: clean(event.event_date) ?? current.event_date,
      event_time: clean(event.event_time) ?? current.event_time,
      address: clean(event.place) ?? current.address,
    };
  }

  return result;
}

/** Normalize a Gemini string field: trimmed non-empty string, or null. */
function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
