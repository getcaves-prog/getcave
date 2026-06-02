import { createClient } from "@/shared/lib/supabase/client";
import type { Tables } from "@/shared/types/database.types";

export type Category = Tables<"categories">;

/**
 * List all categories ordered by name.
 * Local to onboarding — do not import from canvas feature.
 */
export async function listCategories(): Promise<Category[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Get the category IDs selected by the current user (or a given userId).
 * Returns an empty array if the user has no interests.
 */
export async function getMyInterests(userId?: string): Promise<string[]> {
  const supabase = createClient();

  let resolvedUserId = userId;

  if (!resolvedUserId) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw new Error("Tenés que iniciar sesión");
    }
    resolvedUserId = data.user.id;
  }

  const { data, error } = await supabase
    .from("user_interests")
    .select("category_id")
    .eq("user_id", resolvedUserId);

  if (error) {
    throw new Error(`Failed to fetch interests: ${error.message}`);
  }

  return (data ?? []).map((row) => row.category_id);
}

/**
 * Replace the current user's interests with the given set of category IDs.
 * - Deduplicates the input.
 * - An empty array clears all interests.
 * - Requires authentication.
 */
export async function setMyInterests(categoryIds: string[]): Promise<void> {
  const supabase = createClient();

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw new Error("Tenés que iniciar sesión");
  }

  const userId = data.user.id;
  const unique = [...new Set(categoryIds)];

  // Delete-all + insert approach — idempotent and simple
  const { error: deleteError } = await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`Failed to update interests: ${deleteError.message}`);
  }

  if (unique.length === 0) return;

  const rows = unique.map((category_id) => ({ user_id: userId, category_id }));

  const { error: insertError } = await supabase
    .from("user_interests")
    .insert(rows);

  if (insertError) {
    throw new Error(`Failed to update interests: ${insertError.message}`);
  }
}
