import { createClient } from "@/shared/lib/supabase/client";
import type { Flyer } from "../types/canvas.types";

interface FlyerCreator {
  username: string;
  avatar_url: string | null;
}

export async function getFlyerCreator(
  userId: string
): Promise<FlyerCreator | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", userId)
    .single();

  return data;
}

export async function getFlyers(): Promise<Flyer[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flyers")
    .select("*")
    .eq("status", "approved")
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch flyers: ${error.message}`);
  }

  return data;
}

export async function getNearbyFlyers(
  lat: number,
  lng: number,
  radiusKm: number = 50
): Promise<Flyer[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("nearby_flyers", {
    user_lat: lat,
    user_lng: lng,
    radius_km: radiusKm,
  });

  if (error) {
    throw new Error(`Failed to fetch nearby flyers: ${error.message}`);
  }

  return data ?? [];
}
