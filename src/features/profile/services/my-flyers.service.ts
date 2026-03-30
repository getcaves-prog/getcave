import { createClient } from "@/shared/lib/supabase/client";

export async function getMyFlyers() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("flyers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function deleteMyFlyer(flyerId: string, imageUrl: string) {
  const supabase = createClient();

  // Delete from storage first
  if (imageUrl?.includes("supabase.co/storage")) {
    const path = imageUrl.split("/storage/v1/object/public/")[1];
    if (path) {
      const [bucket, ...rest] = path.split("/");
      await supabase.storage.from(bucket).remove([rest.join("/")]);
    }
  }

  // Delete from DB
  const { error } = await supabase.from("flyers").delete().eq("id", flyerId);
  return !error;
}

export async function updateMyFlyer(
  flyerId: string,
  updates: { title?: string; address?: string; duration_days?: number }
) {
  const supabase = createClient();
  const updateData: Record<string, unknown> = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.address !== undefined) updateData.address = updates.address;
  if (updates.duration_days) {
    updateData.duration_days = updates.duration_days;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + updates.duration_days);
    updateData.expires_at = expiresAt.toISOString();
  }

  const { error } = await supabase
    .from("flyers")
    .update(updateData)
    .eq("id", flyerId);
  return !error;
}
