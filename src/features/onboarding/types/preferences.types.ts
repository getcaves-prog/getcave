/**
 * UserPreferences — stored in profiles.preferences (JSONB).
 * Designed to be forward-compatible: add new keys without a migration.
 */

export type LookingFor = "discover" | "meet_people" | "go_solo" | "community";

export interface UserPreferences {
  /** Multi-select chips: "¿qué buscás?" */
  looking_for?: LookingFor[];
  /** Free-text "me gusta…" field */
  likes?: string;
}

/** Chip options for the "¿qué buscás?" onboarding step */
export const LOOKING_FOR_OPTIONS: Array<{ value: LookingFor; label: string }> =
  [
    { value: "discover", label: "Descubrir lugares" },
    { value: "meet_people", label: "Conocer gente" },
    { value: "go_solo", label: "Ir solo/a" },
    { value: "community", label: "Mi comunidad" },
  ];

/** Validated onboarding state returned by getOnboardingState */
export interface OnboardingState {
  completed: boolean;
  completedAt: string | null;
}
