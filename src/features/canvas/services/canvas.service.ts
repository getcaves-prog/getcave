import { createClient } from "@/shared/lib/supabase/client";
import type { Tables } from "@/shared/types/database.types";
import type { Flyer, NearbyFlyer, ScoredFlyer } from "../types/canvas.types";

export type FlyerExtraImage = Tables<"flyer_extra_images">;

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

export async function getFlyers(categoryId?: string): Promise<Flyer[]> {
  const supabase = createClient();

  if (categoryId) {
    // Get flyer IDs that have this category
    const { data: flyerCats } = await supabase
      .from("flyer_categories")
      .select("flyer_id")
      .eq("category_id", categoryId);

    if (!flyerCats || flyerCats.length === 0) return [];

    const flyerIds = flyerCats.map((fc) => fc.flyer_id);

    const { data, error } = await supabase
      .from("flyers")
      .select("*")
      .eq("status", "approved")
      .in("id", flyerIds)
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch flyers: ${error.message}`);
    }

    return data;
  }

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

export async function getFlyerExtraImages(flyerId: string): Promise<FlyerExtraImage[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("flyer_extra_images")
    .select("*")
    .eq("flyer_id", flyerId)
    .order("display_order", { ascending: true });
  return data ?? [];
}

export async function getNearbyFlyers(
  lat: number,
  lng: number,
  radiusKm: number = 25
): Promise<NearbyFlyer[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("nearby_flyers", {
    user_lat: lat,
    user_lng: lng,
    radius_km: radiusKm,
  });

  if (error) {
    throw new Error(`Failed to fetch nearby flyers: ${error.message}`);
  }

  return (data ?? []) as NearbyFlyer[];
}

export async function getNearbyFlyersScored(
  lat: number,
  lng: number,
  radiusKm: number = 25,
  limit: number = 200
): Promise<ScoredFlyer[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("nearby_flyers_scored", {
    user_lat: lat,
    user_lng: lng,
    radius_km: radiusKm,
    result_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to fetch scored flyers: ${error.message}`);
  }

  return (data ?? []) as ScoredFlyer[];
}

export async function getZoneName(
  lat: number,
  lng: number
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_zone_name", {
    lat,
    lng,
  });

  if (error) return null;
  return data as string | null;
}
