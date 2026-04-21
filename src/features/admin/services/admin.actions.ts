"use server";

import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createClient } from "@/shared/lib/supabase/server";

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
