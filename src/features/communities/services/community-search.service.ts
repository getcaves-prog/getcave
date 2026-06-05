import { createClient } from "@/shared/lib/supabase/client";
import { getMyInterests } from "@/features/onboarding/services/interests.service";
import { listCommunities } from "./community.service";
import type { Community } from "../types/community.types";

// ─── Internal helpers ──────────────────────────────────────────────────────

/**
 * Sanitize a raw query string before embedding it in a PostgREST `.or()` filter.
 * - Trims leading/trailing whitespace.
 * - Strips chars that would break the `ilike.%…%` syntax: commas and parentheses.
 * Mirrors the pattern from search.service.ts.
 */
function sanitizeQuery(raw: string): string {
  return raw.trim().replace(/[(),]/g, "");
}

const DEFAULT_SEARCH_LIMIT = 30;
const DEFAULT_RECOMMENDED_LIMIT = 50;

// ─── searchCommunities ─────────────────────────────────────────────────────

/**
 * Search communities by name OR description using a case-insensitive partial match.
 * Returns an empty array (without network call) for blank/whitespace queries.
 * Orders by member_count desc.
 */
export async function searchCommunities(
  query: string,
  opts?: { limit?: number }
): Promise<Community[]> {
  const clean = sanitizeQuery(query);

  if (!clean) {
    return [];
  }

  const limit = opts?.limit ?? DEFAULT_SEARCH_LIMIT;
  const supabase = createClient();

  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .or(`name.ilike.%${clean}%,description.ilike.%${clean}%`)
    .order("member_count", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search communities: ${error.message}`);
  }

  return (data ?? []) as Community[];
}

// ─── getRecommendedCommunities ─────────────────────────────────────────────

/**
 * "Para vos" ranking — NO migration required, all done in-memory.
 *
 * Ranking strategy (3-tier, lexicographic order):
 *   1. City match (user city === community.city) — boolean, 1 vs 0
 *   2. Interest affinity — community has flyers in at least one of the user's
 *      interest categories (boolean, 1 vs 0). Derived from:
 *      - getMyInterests()                           → category_ids[]
 *      - flyer_categories where category_id in (…)  → flyer_ids[]
 *      - flyers where community_id NOT NULL and flyer_id in (…) → community_ids[]
 *   3. member_count desc (popularity tiebreaker).
 *
 * Resilience: if interests cannot be fetched (not logged in, error) or return
 * empty, affinity scores are all 0 and we fall back to city + popularity only.
 */
export async function getRecommendedCommunities(opts?: {
  userId?: string;
  city?: string;
  limit?: number;
}): Promise<Community[]> {
  const limit = opts?.limit ?? DEFAULT_RECOMMENDED_LIMIT;

  // Fetch all communities ordered by member_count (popularity baseline)
  const communities = await listCommunities({ limit });

  if (communities.length === 0) return [];

  // ── Affinity: resolve community_ids with interest-matching flyers ──────
  let affinitySet = new Set<string>();

  try {
    const categoryIds = opts?.userId
      ? await getMyInterests(opts.userId)
      : await getMyInterests().catch(() => [] as string[]);

    if (categoryIds.length > 0) {
      const supabase = createClient();

      // Step 1: get flyer_ids that have any of the user's categories
      const { data: fcRows } = await supabase
        .from("flyer_categories")
        .select("flyer_id")
        .in("category_id", categoryIds);

      const flyerIds = (fcRows ?? []).map((r) => r.flyer_id);

      if (flyerIds.length > 0) {
        // Step 2: get distinct community_ids from those flyers (skip null)
        const { data: flyerRows } = await supabase
          .from("flyers")
          .select("community_id")
          .not("community_id", "is", null)
          .in("id", flyerIds);

        for (const row of flyerRows ?? []) {
          if (row.community_id) affinitySet.add(row.community_id);
        }
      }
    }
  } catch {
    // Silently degrade — no interests or not authenticated
    affinitySet = new Set();
  }

  // ── Score and sort in-memory ──────────────────────────────────────────
  const userCity = opts?.city?.trim().toLowerCase();

  const scored = communities.map((c) => {
    const cityScore = userCity && c.city?.trim().toLowerCase() === userCity ? 1 : 0;
    const affinityScore = affinitySet.has(c.id) ? 1 : 0;
    return { c, cityScore, affinityScore };
  });

  scored.sort((a, b) => {
    // 1st: city match
    if (b.cityScore !== a.cityScore) return b.cityScore - a.cityScore;
    // 2nd: interest affinity
    if (b.affinityScore !== a.affinityScore) return b.affinityScore - a.affinityScore;
    // 3rd: popularity (member_count desc) — already ordered from listCommunities,
    //      but explicit sort keeps it stable even if listCommunities order changes.
    return (b.c.member_count ?? 0) - (a.c.member_count ?? 0);
  });

  return scored.map((s) => s.c);
}
