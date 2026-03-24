"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";

export interface CreateEventData {
  title: string;
  description: string;
  flyerUrl: string;
  venueName: string;
  venueAddress: string;
  latitude: number;
  longitude: number;
  date: string;
  timeStart: string;
  timeEnd: string | null;
  price: number | null;
  currency: string;
  categoryId: string;
  externalUrl: string | null;
}

export async function createEvent(data: CreateEventData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      category_id: data.categoryId,
      title: data.title,
      description: data.description || null,
      flyer_url: data.flyerUrl,
      venue_name: data.venueName,
      venue_address: data.venueAddress,
      location: `POINT(${data.longitude} ${data.latitude})`,
      date: data.date,
      time_start: data.timeStart,
      time_end: data.timeEnd || null,
      price: data.price,
      currency: data.currency || "MXN",
      external_url: data.externalUrl || null,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/event/${event.id}`);
}

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .order("name");
  return data || [];
}
