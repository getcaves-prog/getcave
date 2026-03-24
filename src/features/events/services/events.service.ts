import { createClient } from "@/shared/lib/supabase/server";
import type { EventDetail } from "../types/event.types";

export async function getEventById(
  id: string
): Promise<EventDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      categories (name, slug, icon),
      profiles (username, avatar_url)
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as EventDetail;
}

export async function incrementViewCount(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("increment_view_count", { event_id: id });
}
