// Server-only: reads TICKETMASTER_API_KEY from process.env. Must only be
// imported from server code (the discover aggregator / route handler).
import { filterFreshness } from "@/features/discover/services/apify.service";
import { hash, toIsoDate } from "@/features/discover/services/normalize";
import {
  ProvidersUnavailableError,
  type EventProvider,
  type ProviderParams,
} from "@/features/discover/providers/provider.types";
import {
  createScrapedFlyer,
  type ScrapedFlyer,
} from "@/features/discover/types/discover.types";

const TM_ENDPOINT = "https://app.ticketmaster.com/discovery/v2/events.json";
/** Ticketmaster covers Mexico; override per-deployment via env if needed. */
const DEFAULT_COUNTRY_CODE = "MX";
const MAX_EVENTS = 30;
const TIMEOUT_MS = 15_000;
/** Minimum width for a "good" event image before falling back to the first. */
const MIN_IMAGE_WIDTH = 600;

// ─── Tiny unknown-safe readers (TM data arrives as `unknown`) ─────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

/** Reads a finite number, accepting numeric strings (TM returns lat/lng as strings). */
function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Pick the best event image URL: a wide 16:9 if available, else the first. */
function pickImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  let fallback: string | null = null;
  for (const candidate of images) {
    const rec = asRecord(candidate);
    if (!rec) continue;
    const url = str(rec.url);
    if (!url) continue;
    if (!fallback) fallback = url;
    if (rec.ratio === "16_9" && (num(rec.width) ?? 0) >= MIN_IMAGE_WIDTH) {
      return url;
    }
  }
  return fallback;
}

/** Build a short "Segment · Genre" description, dropping TM's "Undefined" noise. */
function describeClassification(classifications: unknown): string | null {
  if (!Array.isArray(classifications) || classifications.length === 0) {
    return null;
  }
  const first = asRecord(classifications[0]);
  if (!first) return null;
  const segment = asRecord(first.segment);
  const genre = asRecord(first.genre);
  const parts = [segment && str(segment.name), genre && str(genre.name)]
    .filter((p): p is string => Boolean(p))
    .filter((p) => p.toLowerCase() !== "undefined");
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Normalize a single Ticketmaster Discovery event into a ScrapedFlyer.
 *
 * Real shape: { name, id, url, images[], dates.start.{localDate,localTime,
 * dateTime}, classifications[], _embedded.venues[].{name, city.name,
 * location.{latitude,longitude}} }.
 *
 * Returns null when there's no renderable title+image.
 */
export function normalizeTicketmasterEvent(raw: unknown): ScrapedFlyer | null {
  const event = asRecord(raw);
  if (!event) return null;

  const title = str(event.name);
  const image = pickImage(event.images);
  if (!title || !image) return null;

  const dates = asRecord(event.dates);
  const start = dates ? asRecord(dates.start) : null;
  const eventDate = start
    ? str(start.localDate) ?? toIsoDate(str(start.dateTime))
    : null;
  const localTime = start ? str(start.localTime) : null;
  const eventTime = localTime ? localTime.slice(0, 5) : null;

  const externalUrl = str(event.url);

  const embedded = asRecord(event._embedded);
  const venues =
    embedded && Array.isArray(embedded.venues) ? embedded.venues : [];
  const venue = venues.length > 0 ? asRecord(venues[0]) : null;
  const venueName = venue ? str(venue.name) : null;
  const cityRec = venue ? asRecord(venue.city) : null;
  const cityName = cityRec ? str(cityRec.name) : null;
  const location = venue ? asRecord(venue.location) : null;
  const lat = location ? num(location.latitude) : null;
  const lng = location ? num(location.longitude) : null;
  const address = [venueName, cityName].filter(Boolean).join(", ") || null;

  const idSeed = str(event.id) ?? externalUrl ?? title;

  return createScrapedFlyer({
    id: `scraped:ticketmaster:${hash(idSeed)}`,
    source: "ticketmaster",
    title,
    image_url: image,
    external_url: externalUrl,
    event_date: eventDate,
    event_time: eventTime,
    address,
    description: describeClassification(event.classifications),
    _lat: lat ?? undefined,
    _lng: lng ?? undefined,
    _city: cityName ?? undefined,
  });
}

/**
 * Fetch events from the Ticketmaster Discovery API for a keyword + optional
 * city. Returns normalized, freshness-filtered flyers. NEVER over-filters by
 * location — that runs per-request at the route level.
 *
 * Off (returns []) without TICKETMASTER_API_KEY. Throws ProvidersUnavailableError
 * on a hard failure (non-2xx / network / timeout) so the aggregator can skip
 * caching an empty result. A successful HTTP 200 with no events is a genuine
 * empty (returns []), not an error.
 */
export async function fetchTicketmasterEvents({
  query,
  city,
}: ProviderParams): Promise<ScrapedFlyer[]> {
  const apikey = process.env.TICKETMASTER_API_KEY;
  if (!apikey) return [];

  const countryCode =
    process.env.TICKETMASTER_COUNTRY_CODE?.trim() || DEFAULT_COUNTRY_CODE;

  const params = new URLSearchParams({
    apikey,
    keyword: query,
    countryCode,
    sort: "date,asc",
    size: String(MAX_EVENTS),
  });
  if (city) params.set("city", city);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let data: unknown;
  try {
    const res = await fetch(`${TM_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new ProvidersUnavailableError(
        `Ticketmaster responded HTTP ${res.status}`
      );
    }
    data = await res.json();
  } catch (err) {
    if (err instanceof ProvidersUnavailableError) throw err;
    throw new ProvidersUnavailableError("Ticketmaster request failed", {
      cause: err,
    });
  } finally {
    clearTimeout(timer);
  }

  const root = asRecord(data);
  const embedded = root ? asRecord(root._embedded) : null;
  const events =
    embedded && Array.isArray(embedded.events) ? embedded.events : [];

  const flyers: ScrapedFlyer[] = [];
  for (const event of events) {
    const flyer = normalizeTicketmasterEvent(event);
    if (flyer) flyers.push(flyer);
  }

  return filterFreshness(flyers);
}

/** Ticketmaster Discovery API provider — free, official, covers Mexico. */
export const ticketmasterProvider: EventProvider = {
  name: "ticketmaster",
  isEnabled: () => Boolean(process.env.TICKETMASTER_API_KEY),
  fetchEvents: fetchTicketmasterEvents,
};
