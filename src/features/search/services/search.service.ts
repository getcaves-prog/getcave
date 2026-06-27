import { createClient } from "@/shared/lib/supabase/client";
import type { Tables } from "@/shared/types/database.types";
import type { NearbyFlyer } from "@/features/canvas/types/canvas.types";

type FlyerRow = Tables<"flyers">;

export type FlyerSearchResult = Pick<
  FlyerRow,
  | "id"
  | "title"
  | "description"
  | "image_url"
  | "event_date"
  | "event_time"
  | "address"
  | "created_at"
  | "status"
  | "user_id"
>;

const SEARCH_SELECT =
  "id, title, description, image_url, event_date, event_time, address, created_at, status, user_id";

const DEFAULT_LIMIT = 30;

/**
 * Sanitize a raw query string before embedding it in a PostgREST `.or()` filter.
 * - Trims leading/trailing whitespace.
 * - Strips chars that would break the `ilike.%…%` syntax: commas and parentheses.
 */
function sanitizeQuery(raw: string): string {
  return raw
    .trim()
    .replace(/[(),]/g, "");
}

export interface SearchOptions {
  limit?: number;
}

/**
 * Search flyers by title OR description using a case-insensitive partial match.
 * Returns an empty array (without network call) for blank/whitespace queries.
 */
export async function searchFlyers(
  query: string,
  opts: SearchOptions = {}
): Promise<FlyerSearchResult[]> {
  const clean = sanitizeQuery(query);

  if (!clean) {
    return [];
  }

  const limit = opts.limit ?? DEFAULT_LIMIT;
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flyers")
    .select(SEARCH_SELECT)
    .eq("status", "approved")
    .or(`title.ilike.%${clean}%,description.ilike.%${clean}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search flyers: ${error.message}`);
  }

  return (data ?? []) as FlyerSearchResult[];
}

const DEFAULT_RADIUS_KM = 25;

/**
 * Location-aware text search via the `search_nearby_flyers` RPC. Returns approved,
 * non-expired flyers within `radiusKm` whose title/description match `query`,
 * ordered by distance. Use this when the user's coordinates are known; fall back
 * to {@link searchFlyers} (global, no location) when they are not.
 */
export async function searchNearbyFlyers(
  query: string,
  lat: number,
  lng: number,
  radiusKm: number = DEFAULT_RADIUS_KM
): Promise<NearbyFlyer[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("search_nearby_flyers", {
    p_query: query.trim(),
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
  });

  if (error) {
    throw new Error(`Failed to search nearby flyers: ${error.message}`);
  }

  return (data ?? []) as NearbyFlyer[];
}
