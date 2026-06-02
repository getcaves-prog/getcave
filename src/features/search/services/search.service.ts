import { createClient } from "@/shared/lib/supabase/client";
import type { Tables } from "@/shared/types/database.types";

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
    .or(`title.ilike.%${clean}%,description.ilike.%${clean}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search flyers: ${error.message}`);
  }

  return (data ?? []) as FlyerSearchResult[];
}
