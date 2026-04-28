import { createClient } from "@/shared/lib/supabase/client";
import type {
  AdminStats,
  CreateFlyerPayload,
  FlyerStatus,
  UserRole,
} from "@/features/admin/types/admin.types";

export async function getStats(): Promise<AdminStats> {
  const supabase = createClient();

  const [flyersRes, pendingRes, usersRes] = await Promise.all([
    supabase.from("flyers").select("id", { count: "exact", head: true }),
    supabase
      .from("flyers")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalFlyers: flyersRes.count ?? 0,
    pendingFlyers: pendingRes.count ?? 0,
    totalUsers: usersRes.count ?? 0,
  };
}

export async function getFlyers(status?: string) {
  const supabase = createClient();

  let query = supabase
    .from("flyers")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getRecentFlyers() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flyers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data;
}

export async function updateFlyerStatus(id: string, status: FlyerStatus) {
  const supabase = createClient();

  const { error } = await supabase
    .from("flyers")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteFlyer(id: string) {
  const supabase = createClient();

  // First get the flyer to check if image is in Supabase storage
  const { data: flyer } = await supabase
    .from("flyers")
    .select("image_url")
    .eq("id", id)
    .single();

  // Delete the image from storage if it's a Supabase storage URL
  if (flyer?.image_url?.includes("supabase.co/storage")) {
    const path = flyer.image_url.split("/storage/v1/object/public/")[1];
    if (path) {
      const [bucket, ...rest] = path.split("/");
      await supabase.storage.from(bucket).remove([rest.join("/")]);
    }
  }

  const { error } = await supabase.from("flyers").delete().eq("id", id);
  if (error) throw error;
}

export async function createFlyer(data: CreateFlyerPayload) {
  const supabase = createClient();

  const location =
    data.latitude !== undefined && data.longitude !== undefined
      ? `SRID=4326;POINT(${data.longitude} ${data.latitude})`
      : undefined;

  const { error } = await supabase.from("flyers").insert({
    title: data.title,
    image_url: data.image_url,
    address: data.address,
    status: data.status,
    ...(location && { location }),
  });

  if (error) throw error;
}

export async function getAnalytics() {
  const supabase = createClient();

  // Total views this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count: weeklyViews } = await supabase
    .from("flyer_views")
    .select("*", { count: "exact", head: true })
    .gte("viewed_at", weekAgo.toISOString());

  // Top 5 most viewed flyers (by view count from flyer_views)
  const { data: topFlyersRaw } = await supabase
    .from("flyers")
    .select("id, title, image_url")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  // Get view counts for top flyers
  let topFlyers: { id: string; title: string | null; image_url: string; views_count: number }[] = [];
  if (topFlyersRaw && topFlyersRaw.length > 0) {
    const viewCounts = await Promise.all(
      topFlyersRaw.map(async (f) => {
        const { count } = await supabase
          .from("flyer_views")
          .select("*", { count: "exact", head: true })
          .eq("flyer_id", f.id);
        return { ...f, views_count: count ?? 0 };
      })
    );
    topFlyers = viewCounts
      .sort((a, b) => b.views_count - a.views_count)
      .slice(0, 5);
  }

  // Active users (users who uploaded in last 30 days)
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const { count: activeUploaders } = await supabase
    .from("flyers")
    .select("user_id", { count: "exact", head: true })
    .gte("created_at", monthAgo.toISOString())
    .not("user_id", "is", null);

  // Expiring soon (next 3 days)
  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);
  const { count: expiringSoon } = await supabase
    .from("flyers")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved")
    .lte("expires_at", threeDays.toISOString())
    .gte("expires_at", new Date().toISOString());

  return {
    weeklyViews: weeklyViews ?? 0,
    topFlyers,
    activeUploaders: activeUploaders ?? 0,
    expiringSoon: expiringSoon ?? 0,
  };
}

export async function deleteAllTestFlyers() {
  const supabase = createClient();
  const { error } = await supabase
    .from("flyers")
    .delete()
    .like("image_url", "%picsum.photos%");
  if (error) throw error;
}

export async function getUsers() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, terms_acceptances(accepted_at, terms_version)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as import("@/features/admin/types/admin.types").Profile[];
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) throw error;
}

export async function promoteFlyer(id: string, durationDays: number = 30) {
  const supabase = createClient();

  const promotedUntil = new Date();
  promotedUntil.setDate(promotedUntil.getDate() + durationDays);

  const { error } = await supabase
    .from("flyers")
    .update({
      is_promoted: true,
      promoted_until: promotedUntil.toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function unpromoteFlyer(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("flyers")
    .update({
      is_promoted: false,
      promoted_until: null,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function getReportCount(): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("flyer_reports")
    .select("*", { count: "exact", head: true });

  if (error) return 0;
  return count ?? 0;
}
