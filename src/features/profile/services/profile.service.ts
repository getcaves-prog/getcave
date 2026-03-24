"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function getProfileWithEvents() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const { data: events } = await supabase
    .from("events")
    .select("*, categories(name, icon)")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  return { ...profile, events: events || [] };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const username = formData.get("username") as string;
  const bio = formData.get("bio") as string;
  const avatarUrl = formData.get("avatar_url") as string;

  const { error } = await supabase
    .from("profiles")
    .update({
      username: username || undefined,
      bio: bio || null,
      avatar_url: avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  redirect("/profile");
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", url: null };

  const file = formData.get("avatar") as File;
  if (!file) return { error: "No file provided", url: null };

  const filePath = `${user.id}/avatar.webp`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: "image/webp",
    });

  if (error) return { error: error.message, url: null };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return { error: null, url: publicUrl };
}
