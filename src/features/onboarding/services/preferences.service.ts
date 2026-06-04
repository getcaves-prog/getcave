import { createClient } from "@/shared/lib/supabase/client";
import type { Json } from "@/shared/types/database.types";
import type { UserPreferences, OnboardingState } from "../types/preferences.types";

// ─── Internal helpers ──────────────────────────────────────────────────────

/** Resolve caller's user ID. Throws "Tenés que iniciar sesión" if unauthenticated. */
async function resolveUserId(supabase: ReturnType<typeof createClient>, userId?: string): Promise<string> {
  if (userId) return userId;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Tenés que iniciar sesión");
  return data.user.id;
}

/**
 * Strip unknown keys from a preferences object so we never persist
 * arbitrary caller-supplied keys into the JSONB column.
 * Only the declared UserPreferences keys are kept.
 */
function sanitizePreferences(prefs: UserPreferences): UserPreferences {
  const result: UserPreferences = {};
  if (prefs.looking_for !== undefined) result.looking_for = prefs.looking_for;
  if (prefs.likes !== undefined) result.likes = prefs.likes;
  return result;
}

// ─── getOnboardingState ────────────────────────────────────────────────────

/**
 * Returns whether the user has completed onboarding and the timestamp if so.
 * If userId is omitted, resolves the current session user.
 */
export async function getOnboardingState(userId?: string): Promise<OnboardingState> {
  const supabase = createClient();
  const uid = await resolveUserId(supabase, userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", uid)
    .single();

  if (error) throw new Error(`Failed to get onboarding state: ${error.message}`);

  const completedAt = data?.onboarding_completed_at ?? null;
  return {
    completed: completedAt !== null,
    completedAt,
  };
}

// ─── completeOnboarding ────────────────────────────────────────────────────

/**
 * Marks onboarding as completed for the currently authenticated user
 * by setting onboarding_completed_at to the current timestamp.
 * Requires an active session.
 */
export async function completeOnboarding(): Promise<void> {
  const supabase = createClient();
  const uid = await resolveUserId(supabase);

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", uid);

  if (error) throw new Error(`Failed to complete onboarding: ${error.message}`);
}

// ─── getPreferences ────────────────────────────────────────────────────────

/**
 * Reads the user's stored preferences from profiles.preferences (JSONB).
 * Returns an empty object if the column is null or the profile row is missing.
 * If userId is omitted, resolves the current session user.
 */
export async function getPreferences(userId?: string): Promise<UserPreferences> {
  const supabase = createClient();
  const uid = await resolveUserId(supabase, userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", uid)
    .single();

  if (error) throw new Error(`Failed to get preferences: ${error.message}`);
  if (!data || data.preferences === null) return {};

  return data.preferences as UserPreferences;
}

// ─── setPreferences ────────────────────────────────────────────────────────

/**
 * Replaces the user's stored preferences with the given value.
 * Unknown keys are stripped before persisting (sanitize, not merge).
 * Requires an active session.
 *
 * Design choice: REPLACE (not merge) — the caller is responsible for
 * reading current preferences first if partial update is needed. This
 * avoids stale-merge bugs and keeps the column's shape predictable.
 */
export async function setPreferences(prefs: UserPreferences): Promise<void> {
  const supabase = createClient();
  const uid = await resolveUserId(supabase);

  const sanitized = sanitizePreferences(prefs);

  const { error } = await supabase
    .from("profiles")
    // Cast needed: UserPreferences is a strict interface; Supabase expects
    // the recursive Json type for JSONB columns.
    .update({ preferences: sanitized as unknown as Json })
    .eq("id", uid);

  if (error) throw new Error(`Failed to set preferences: ${error.message}`);
}
