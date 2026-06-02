import { createClient } from "@/shared/lib/supabase/client";

export async function trackFlyerView(flyerId: string) {
  // Don't track views for grid-generated IDs (contain comma)
  if (flyerId.includes(",")) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("flyer_views").insert({
    flyer_id: flyerId,
    viewer_id: user?.id ?? null,
  });
}

export async function getFlyerViewCount(flyerId: string): Promise<number> {
  if (flyerId.includes(",")) return 0;

  const supabase = createClient();
  const { count } = await supabase
    .from("flyer_views")
    .select("*", { count: "exact", head: true })
    .eq("flyer_id", flyerId);

  return count ?? 0;
}
