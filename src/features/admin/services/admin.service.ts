import { createClient } from "@/shared/lib/supabase/client";
import type {
  AdminStats,
  CreateEventPayload,
  EventStatus,
  UserRole,
} from "@/features/admin/types/admin.types";

export async function getStats(): Promise<AdminStats> {
  const supabase = createClient();

  const [flyersRes, pendingRes, usersRes] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase
      .from("events")
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
    .from("events")
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
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data;
}

export async function updateFlyerStatus(id: string, status: EventStatus) {
  const supabase = createClient();

  const { error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteFlyer(id: string) {
  const supabase = createClient();

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function createFlyer(data: CreateEventPayload) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Build location as EWKT string for PostGIS if coordinates are available
  const location =
    data.latitude !== undefined && data.longitude !== undefined
      ? `SRID=4326;POINT(${data.longitude} ${data.latitude})`
      : `SRID=4326;POINT(-100.3161 25.6866)`; // Default: Monterrey

  const { error } = await supabase.from("events").insert({
    title: data.title,
    flyer_url: data.image_url,
    venue_address: data.address,
    venue_name: data.address,
    status: data.status,
    user_id: user.id,
    category_id: "00000000-0000-0000-0000-000000000000",
    date: new Date().toISOString().split("T")[0],
    time_start: "00:00",
    location,
  });

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
