import { createClient } from "@/shared/lib/supabase/client";
import type { Flyer } from "../types/canvas.types";

export async function toggleSaveFlyer(flyerId: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Check if already saved
  const { data: existing } = await supabase
    .from("saved_flyers")
    .select("id")
    .eq("user_id", user.id)
    .eq("flyer_id", flyerId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_flyers").delete().eq("id", existing.id);
    return false; // unsaved
  } else {
    await supabase
      .from("saved_flyers")
      .insert({ user_id: user.id, flyer_id: flyerId });
    return true; // saved
  }
}

export async function isFlyerSaved(flyerId: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("saved_flyers")
    .select("id")
    .eq("user_id", user.id)
    .eq("flyer_id", flyerId)
    .maybeSingle();

  return !!data;
}

export async function getSavedFlyers(): Promise<Flyer[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: savedRows } = await supabase
    .from("saved_flyers")
    .select("flyer_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!savedRows || savedRows.length === 0) return [];

  const flyerIds = savedRows.map((r) => r.flyer_id);

  const { data: flyers } = await supabase
    .from("flyers")
    .select("*")
    .in("id", flyerIds);

  if (!flyers) return [];

  // Preserve the saved order
  const flyerMap = new Map(flyers.map((f) => [f.id, f]));
  return flyerIds
    .map((id) => flyerMap.get(id))
    .filter((f): f is Flyer => f !== undefined);
}
