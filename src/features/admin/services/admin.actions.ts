"use server";

import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createClient } from "@/shared/lib/supabase/server";
import type { UserRole } from "@/features/admin/types/admin.types";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");
}

export async function deleteFlyerAction(id: string) {
  await assertAdmin();
  const supabase = createAdminClient();

  const { data: flyer } = await supabase
    .from("flyers")
    .select("image_url")
    .eq("id", id)
    .single();

  if (flyer?.image_url?.includes("supabase.co/storage")) {
    const path = flyer.image_url.split("/storage/v1/object/public/")[1];
    if (path) {
      const [bucket, ...rest] = path.split("/");
      await supabase.storage.from(bucket).remove([rest.join("/")]);
    }
  }

  const { error } = await supabase.from("flyers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAllTestFlyersAction() {
  await assertAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("flyers")
    .delete()
    .like("image_url", "%picsum.photos%");

  if (error) throw new Error(error.message);
}

export async function updateFlyerStatusAction(id: string, status: "pending" | "approved" | "rejected") {
  await assertAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("flyers").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function promoteFlyerAction(id: string, durationDays: number = 30) {
  await assertAdmin();
  const supabase = createAdminClient();

  const promotedUntil = new Date();
  promotedUntil.setDate(promotedUntil.getDate() + durationDays);

  const { error } = await supabase
    .from("flyers")
    .update({ is_promoted: true, promoted_until: promotedUntil.toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function unpromoteFlyerAction(id: string) {
  await assertAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("flyers")
    .update({ is_promoted: false, promoted_until: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateUserRoleAction(userId: string, role: UserRole) {
  await assertAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function deleteUserAction(userId: string) {
  await assertAdmin();
  const supabase = createAdminClient();

  // Delete storage objects for each flyer owned by this user
  const { data: flyers } = await supabase
    .from("flyers")
    .select("image_url")
    .eq("user_id", userId);

  if (flyers && flyers.length > 0) {
    await Promise.allSettled(
      flyers
        .filter((f) => f.image_url?.includes("supabase.co/storage"))
        .map((f) => {
          const path = f.image_url!.split("/storage/v1/object/public/")[1];
          if (!path) return Promise.resolve();
          const [bucket, ...rest] = path.split("/");
          return supabase.storage.from(bucket).remove([rest.join("/")]);
        })
    );
  }

  // deleteUser removes auth.users row — profiles + flyers cascade via FK
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}
