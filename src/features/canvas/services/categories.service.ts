import { createClient } from "@/shared/lib/supabase/client";
import type { Tables } from "@/shared/types/database.types";

export type Category = Tables<"categories">;

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data;
}

export async function getFlyerCategories(flyerId: string): Promise<Category[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flyer_categories")
    .select("category_id")
    .eq("flyer_id", flyerId);

  if (error) {
    throw new Error(`Failed to fetch flyer categories: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  const categoryIds = data.map((fc) => fc.category_id);

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("*")
    .in("id", categoryIds);

  if (catError) {
    throw new Error(`Failed to fetch categories: ${catError.message}`);
  }

  return categories ?? [];
}

export async function setFlyerCategories(
  flyerId: string,
  categoryIds: string[]
): Promise<void> {
  const supabase = createClient();

  // Delete existing associations
  await supabase.from("flyer_categories").delete().eq("flyer_id", flyerId);

  if (categoryIds.length === 0) return;

  const rows = categoryIds.map((categoryId) => ({
    flyer_id: flyerId,
    category_id: categoryId,
  }));

  const { error } = await supabase.from("flyer_categories").insert(rows);

  if (error) {
    throw new Error(`Failed to set flyer categories: ${error.message}`);
  }
}
