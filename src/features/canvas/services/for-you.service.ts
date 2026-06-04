import { createClient } from "@/shared/lib/supabase/client";
import type { ScoredFlyer } from "../types/canvas.types";

/**
 * ForYouFlyer — same shape as ScoredFlyer plus interest_score.
 * Returned by the nearby_flyers_for_you RPC.
 */
export type ForYouFlyer = ScoredFlyer & {
  interest_score: number;
};

/**
 * Fetch the personalized "For You" feed for the given coordinates.
 * Calls nearby_flyers_for_you RPC which extends nearby_flyers_scored
 * with an interest boost derived from the caller's user_interests.
 *
 * @param lat       - Latitude of the user's current location
 * @param lng       - Longitude of the user's current location
 * @param radiusKm  - Search radius in km (default 25)
 * @param limit     - Maximum number of results (default 200)
 */
export async function getForYouFlyers(
  lat: number,
  lng: number,
  radiusKm: number = 25,
  limit: number = 200
): Promise<ForYouFlyer[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("nearby_flyers_for_you", {
    user_lat: lat,
    user_lng: lng,
    radius_km: radiusKm,
    result_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to fetch for-you flyers: ${error.message}`);
  }

  return (data ?? []) as ForYouFlyer[];
}
