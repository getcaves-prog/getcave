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
 * Normalize a single Apify item into a ScrapedFlyer.
 *
 * Dispatches on `source` because the two configured actors return very
 * different shapes:
 *   - facebook  → apify/facebook-events-scraper (event objects)
 *   - instagram → apify/instagram-hashtag-scraper (post objects)
 *
 * Returns `null` (skips the item) whenever it can't produce a renderable flyer.
 */
export function normalizeApifyEvent(
  raw: unknown,
  source: ScrapedSource
): ScrapedFlyer | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  if (source === "facebook") {
    return normalizeFacebookEvent(obj);
  }
  return normalizeInstagramPost(obj);
}

/**
 * Facebook events scraper (apify/facebook-events-scraper) → ScrapedFlyer.
 *
 * Real keys: name, url, imageUrl, imageCaption, utcStartDate, startTime,
 * dateTimeSentence, address, isCanceled, isPast, description, usersGoing,
 * usersInterested, location { name, city, latitude, longitude, ... }.
 *
 * Skip (return null) when the event is canceled or past, or when it lacks a
 * usable image OR name (can't render a flyer without both).
 */
function normalizeFacebookEvent(
  obj: Record<string, unknown>
): ScrapedFlyer | null {
  if (obj.isCanceled === true || obj.isPast === true) {
    return null;
  }

  const title = pickString(obj, ["name"]);
  const image = pickString(obj, ["imageUrl"]);
  if (!title || !image) {
    return null;
  }

  const externalUrl = pickString(obj, ["url"]);
  const eventDate = toIsoDate(pickString(obj, ["utcStartDate"]));
  const eventTime = pickString(obj, ["startTime"]);
  const description = pickString(obj, ["description"]);

  const location = isRecord(obj.location) ? obj.location : null;
  const address =
    pickString(obj, ["address"]) ??
    (location ? pickString(location, ["name", "city"]) : null);

  const idSeed = externalUrl ?? title;

  return createScrapedFlyer({
    id: `scraped:facebook:${hash(idSeed)}`,
    source: "facebook",
    title,
    image_url: image,
    external_url: externalUrl,
    event_date: eventDate,
    event_time: eventTime,
    address,
    description,
  });
}

/**
 * Instagram hashtag scraper (apify/instagram-hashtag-scraper) → ScrapedFlyer.
 *
 * Real keys: caption, displayUrl, url, timestamp, locationName, ownerUsername,
 * type, shortCode, images[].
 *
 * Image: displayUrl, falling back to images[0]. Skip (return null) only when
 * there is no usable image at all — `type` ("Image"/"Video"/"Sidecar") is not a
 * reason to skip as long as we have a thumbnail.
 *
 * NOTE: event_date is the POST date (timestamp), not a real event date. This is
 * acceptable for V1 — IG posts have no structured event schedule.
 */
function normalizeInstagramPost(
  obj: Record<string, unknown>
): ScrapedFlyer | null {
  const image = pickString(obj, ["displayUrl"]) ?? firstImage(obj.images);
  if (!image) {
    return null;
  }

  const caption = pickString(obj, ["caption"]);
  const ownerUsername = pickString(obj, ["ownerUsername"]);
  const title = captionTitle(caption, ownerUsername);

  const externalUrl = pickString(obj, ["url"]);
  const eventDate = toIsoDate(pickString(obj, ["timestamp"]));
  const address = pickString(obj, ["locationName"]);

  const idSeed = externalUrl ?? title;

  return createScrapedFlyer({
    id: `scraped:instagram:${hash(idSeed)}`,
    source: "instagram",
    title,
    image_url: image,
    external_url: externalUrl,
    event_date: eventDate,
    event_time: null,
    address,
    description: caption,
  });
}

/** First non-empty string in an images array, or null. */
function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  for (const candidate of images) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

/**
 * Build an IG flyer title from the caption: first line, trimmed to ~80 chars.
 * Falls back to `@username`, then a generic label.
 */
function captionTitle(
  caption: string | null,
  ownerUsername: string | null
): string {
  if (caption) {
    const firstLine = caption.split("\n")[0].trim();
    if (firstLine.length > 0) {
      return firstLine.length > 80 ? firstLine.slice(0, 80).trim() : firstLine;
    }
  }
  if (ownerUsername) return `@${ownerUsername}`;
  return "Post de Instagram";
}

/** Narrow an unknown value to a plain object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
