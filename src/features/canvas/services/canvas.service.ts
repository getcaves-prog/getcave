import { createClient } from "@/shared/lib/supabase/client";
import type { Flyer } from "../types/canvas.types";

export async function getFlyers(): Promise<Flyer[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flyers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch flyers: ${error.message}`);
  }

  return data;
}
