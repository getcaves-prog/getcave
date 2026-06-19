import {
  createScrapedFlyer,
  type ScrapedFlyer,
  type ScrapedSource,
} from "@/features/discover/types/discover.types";

/** Reads a string-valued property from a record, trying aliases in order. */
function pickString(
  obj: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

/** Converts a raw date-ish string into an ISO date (YYYY-MM-DD), or null. */
function toIsoDate(raw: string | null): string | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/**
 * Tiny deterministic string hash (djb2). Not cryptographic — only used to make
 * a stable synthetic id per event so dedupe works across runs.
 */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  // Coerce to unsigned and base36 for a short, url-safe id.
  return (h >>> 0).toString(36);
}

/**
 * Normalize a single Apify event object into a ScrapedFlyer.
 *
 * Apify event fields vary by actor, so this handles common shapes defensively.
 * Returns `null` when the event lacks a usable image OR title (can't render a
 * flyer without both).
 */
export function normalizeApifyEvent(
  raw: unknown,
  source: ScrapedSource
): ScrapedFlyer | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  const title = pickString(obj, ["name", "title", "eventName"]);
  const image = pickString(obj, [
    "image",
    "imageUrl",
    "thumbnailUrl",
    "imageURL",
    "cover",
    "photo",
  ]);

  // A flyer is unrenderable without both a title and an image.
  if (!title || !image) {
    return null;
  }

  const externalUrl = pickString(obj, [
    "url",
    "eventUrl",
    "link",
    "permalink",
  ]);
  const rawDate = pickString(obj, [
    "date",
    "startDate",
    "dateTime",
    "startTime",
    "start_date",
  ]);
  const eventTime = pickString(obj, ["time", "eventTime", "start_time"]);
  const address = pickString(obj, [
    "location",
    "address",
    "venue",
    "place",
  ]);

  // Stable id: prefer the external url (most unique), fall back to title.
  const idSeed = externalUrl ?? title;

  return createScrapedFlyer({
    id: `scraped:${source}:${hash(idSeed)}`,
    source,
    title,
    image_url: image,
    external_url: externalUrl,
    event_date: toIsoDate(rawDate),
    event_time: eventTime,
    address,
  });
}
