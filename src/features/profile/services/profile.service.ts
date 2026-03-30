import { createClient } from "@/shared/lib/supabase/client";

export async function getProfileByUsername(username: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, city, role, created_at")
    .eq("username", username)
    .single();
  return data;
}

export async function getUserFlyers(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("flyers")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getUserStats(userId: string) {
  const supabase = createClient();
  const { data } = await supabase.rpc("get_user_stats", {
    target_user_id: userId,
  });
  return (
    (data as { flyers_posted: number; total_views: number; total_saves: number } | null) ?? {
      flyers_posted: 0,
      total_views: 0,
      total_saves: 0,
    }
  );
}
