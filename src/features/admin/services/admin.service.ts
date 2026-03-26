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
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) throw error;
}
