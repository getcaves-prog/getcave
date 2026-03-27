import type {
  GeocodingResult,
  ReverseGeocodingResult,
  ForwardGeocodeOptions,
  ReverseGeocodeOptions,
} from "./types";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const MAPBOX_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const USER_AGENT = "CavesApp/1.0";

const DEFAULT_LIMIT = 5;

function getMapboxToken(): string | null {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  }
  return null;
}

/**
 * Throttle guard for Nominatim's 1 req/sec rate limit.
 * Delays the request if the last one was less than 1 second ago.
 */
let lastNominatimRequest = 0;

async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastNominatimRequest;

  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
  }

  lastNominatimRequest = Date.now();
}

// -- Nominatim helpers --

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

interface NominatimReverseResult {
  display_name: string;
  address?: Record<string, string>;
}

function formatNominatimAddress(
  address?: Record<string, string>
): string {
  if (!address) return "";

  const parts = [
    address.road,
    address.house_number,
    address.suburb ?? address.neighbourhood,
    address.city ?? address.town ?? address.village,
    address.state,
    address.country,
  ].filter(Boolean);

  return parts.join(", ");
}

async function nominatimForward(
  query: string,
  limit: number
): Promise<GeocodingResult[]> {
  await throttleNominatim();

  const params = new URLSearchParams({
    format: "json",
    q: query,
    limit: String(limit),
    addressdetails: "1",
  });

  const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) return [];

  const data: NominatimSearchResult[] = await response.json();

  return data.map((item) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    displayName: item.display_name,
    address: formatNominatimAddress(item.address) || item.display_name,
  }));
}

async function nominatimReverse(
  lat: number,
  lng: number
): Promise<ReverseGeocodingResult | null> {
  await throttleNominatim();

  const params = new URLSearchParams({
    format: "json",
    lat: String(lat),
    lon: String(lng),
    addressdetails: "1",
  });

  const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) return null;

  const data: NominatimReverseResult = await response.json();

  if (!data.display_name) return null;

  // Extract just the city name for display
  const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? data.address?.state ?? data.address?.country ?? data.display_name.split(",")[0];

  return {
    displayName: city,
    address: formatNominatimAddress(data.address) || data.display_name,
  };
}

// -- Mapbox helpers --

interface MapboxFeature {
  center: [number, number]; // [lng, lat]
  place_name: string;
  text: string;
  properties: Record<string, unknown>;
}

interface MapboxResponse {
  features: MapboxFeature[];
}

async function mapboxForward(
  query: string,
  limit: number,
  token: string
): Promise<GeocodingResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const params = new URLSearchParams({
    access_token: token,
    limit: String(limit),
  });

  const response = await fetch(
    `${MAPBOX_BASE}/${encodedQuery}.json?${params}`
  );

  if (!response.ok) return [];

  const data: MapboxResponse = await response.json();

  return data.features.map((feature) => ({
    lat: feature.center[1],
    lng: feature.center[0],
    displayName: feature.place_name,
    address: feature.place_name,
  }));
}

async function mapboxReverse(
  lat: number,
  lng: number,
  token: string
): Promise<ReverseGeocodingResult | null> {
  const params = new URLSearchParams({
    access_token: token,
    limit: "1",
  });

  const response = await fetch(
    `${MAPBOX_BASE}/${lng},${lat}.json?${params}`
  );

  if (!response.ok) return null;

  const data: MapboxResponse = await response.json();
  const feature = data.features[0];

  if (!feature) return null;

  return {
    displayName: feature.place_name,
    address: feature.place_name,
  };
}

// -- Public API --

/**
 * Forward geocode: convert an address string to coordinates.
 * Tries Nominatim first (free), falls back to Mapbox if available.
 */
export async function forwardGeocode(
  query: string,
  options: ForwardGeocodeOptions = {}
): Promise<GeocodingResult[]> {
  const { limit = DEFAULT_LIMIT } = options;

  if (!query.trim()) return [];

  try {
    const results = await nominatimForward(query, limit);

    if (results.length > 0) return results;
  } catch {
    // Nominatim failed, try fallback
  }

  const token = getMapboxToken();
  if (!token) return [];

  try {
    return await mapboxForward(query, limit, token);
  } catch {
    return [];
  }
}

/**
 * Reverse geocode: convert coordinates to an address.
 * Tries Nominatim first, falls back to Mapbox if available.
 */
export async function reverseGeocode(
  options: ReverseGeocodeOptions
): Promise<ReverseGeocodingResult | null> {
  const { lat, lng } = options;

  try {
    const result = await nominatimReverse(lat, lng);

    if (result) return result;
  } catch {
    // Nominatim failed, try fallback
  }

  const token = getMapboxToken();
  if (!token) return null;

  try {
    return await mapboxReverse(lat, lng, token);
  } catch {
    return null;
  }
}

/**
 * Autocomplete: get address suggestions for partial input.
 * Uses the same forward geocoding pipeline.
 *
 * Important: The consuming hook should debounce calls to this function
 * (recommended: 300-500ms) to respect Nominatim's rate limits.
 */
export async function autocomplete(
  query: string,
  limit: number = DEFAULT_LIMIT
): Promise<GeocodingResult[]> {
  return forwardGeocode(query, { limit, autocomplete: true });
}
