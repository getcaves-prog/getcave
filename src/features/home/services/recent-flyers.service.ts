import { createClient } from "@/shared/lib/supabase/client";
import type { Flyer } from "@/features/canvas/types/canvas.types";

/** Fields the home carousel needs from a flyer. */
export type RecentFlyer = Pick<
  Flyer,
  | "id"
  | "title"
  | "image_url"
  | "event_date"
  | "event_time"
  | "address"
  | "community_id"
>;

/**
 * Fetches the most recent approved, non-expired flyers for the home carousel.
 * Returns an empty array on error so the section can hide gracefully.
 */
export async function getRecentFlyers(limit = 6): Promise<RecentFlyer[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flyers")
    .select("id, title, image_url, event_date, event_time, address, community_id")
    .eq("status", "approved")
    .not("image_url", "is", null)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}
