/**
 * UserPreferences — stored in profiles.preferences (JSONB).
 * Designed to be forward-compatible: add new keys without a migration.
 *
 * NOTE: When adding a new key here you MUST also add it to the allowlist in
 * `sanitizePreferences` (preferences.service.ts) or it will be silently
 * stripped before persisting.
 */

export type LookingFor = "discover" | "meet_people" | "go_solo" | "community";

export interface UserPreferences {
  /** Multi-select chips: "¿qué buscás?" */
  looking_for?: LookingFor[];
  /** Free-text "me gusta…" field */
  likes?: string;
  /** Música — multi-select genres (values from MUSIC_OPTIONS) */
  music_genres?: string[];
  /** Vibe / ambiente — multi-select (values from VIBE_OPTIONS) */
  vibes?: string[];
  /** ¿Con quién salís? — multi-select (values from COMPANY_OPTIONS) */
  company?: string[];
  /** ¿Cuándo? — multi-select (values from TIMING_OPTIONS) */
  timing?: string[];
}

/** Chip options for the "¿qué buscás?" onboarding step */
export const LOOKING_FOR_OPTIONS: Array<{ value: LookingFor; label: string }> =
  [
    { value: "discover", label: "Descubrir lugares" },
    { value: "meet_people", label: "Conocer gente" },
    { value: "go_solo", label: "Ir solo/a" },
    { value: "community", label: "Mi comunidad" },
  ];

/** Música — step 2 chips */
export const MUSIC_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "techno", label: "Techno" },
  { value: "house", label: "House" },
  { value: "electronica", label: "Electrónica" },
  { value: "rock", label: "Rock" },
  { value: "indie", label: "Indie" },
  { value: "pop", label: "Pop" },
  { value: "reggaeton", label: "Reggaetón" },
  { value: "salsa_bachata", label: "Salsa / Bachata" },
  { value: "cumbia", label: "Cumbia" },
  { value: "jazz", label: "Jazz" },
  { value: "hip_hop", label: "Hip-Hop" },
  { value: "regional_folk", label: "Regional / Folk" },
];

/** Vibe — step 3 chips */
export const VIBE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "under", label: "Under / Alternativo" },
  { value: "masivo", label: "Masivo / Fiestón" },
  { value: "intimo", label: "Íntimo / Chill" },
  { value: "cultural", label: "Cultural / Arte" },
  { value: "aire_libre", label: "Al aire libre" },
  { value: "after", label: "After" },
];

/** ¿Con quién salís? — step 4 chips */
export const COMPANY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "solo", label: "Solo/a" },
  { value: "pareja", label: "En pareja" },
  { value: "amigos", label: "Con amigos" },
  { value: "grupo", label: "Grupo grande" },
];

/** ¿Cuándo? — step 5 chips */
export const TIMING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "semana", label: "Entre semana" },
  { value: "finde", label: "Fines de semana" },
  { value: "dia", label: "De día" },
  { value: "noche", label: "De noche" },
];

/** Validated onboarding state returned by getOnboardingState */
export interface OnboardingState {
  completed: boolean;
  completedAt: string | null;
}
