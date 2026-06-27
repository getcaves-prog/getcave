import {
  MUSIC_OPTIONS,
  VIBE_OPTIONS,
} from "@/features/onboarding/types/preferences.types";
import type { UserPreferences } from "@/features/onboarding/types/preferences.types";

/**
 * Preset queries used as a fallback when the user has no usable preferences.
 * Mirrors the old random presets the "Sorpréndeme" button used.
 */
export const SURPRISE_PRESETS = [
  "bailar salsa",
  "concierto rock",
  "expo de arte",
  "rave techno",
  "stand up comedy",
  "fiesta electrónica",
  "festival gastronómico",
  "mercado de diseño",
] as const;

/**
 * Override map: option values whose readable search term differs from the
 * onboarding chip label. The chip label "Salsa / Bachata" is not a good search
 * query, so we collapse it to a single word. Anything not listed here falls
 * back to the lowercased option label.
 */
const MUSIC_QUERY_OVERRIDES: Record<string, string> = {
  salsa_bachata: "salsa",
};

const VIBE_QUERY_OVERRIDES: Record<string, string> = {
  under: "alternativo",
  masivo: "fiestón",
  intimo: "chill",
  cultural: "arte",
  aire_libre: "aire libre",
  after: "after",
};

/** value → label lookups built once from the *_OPTIONS arrays. */
const MUSIC_LABELS = new Map(MUSIC_OPTIONS.map((o) => [o.value, o.label]));
const VIBE_LABELS = new Map(VIBE_OPTIONS.map((o) => [o.value, o.label]));

/** Map a music option value to a query-friendly readable term, or null. */
function musicTerm(value: string): string | null {
  if (MUSIC_QUERY_OVERRIDES[value]) return MUSIC_QUERY_OVERRIDES[value];
  const label = MUSIC_LABELS.get(value);
  return label ? label.toLowerCase() : null;
}

/** Map a vibe option value to a query-friendly readable term, or null. */
function vibeTerm(value: string): string | null {
  if (VIBE_QUERY_OVERRIDES[value]) return VIBE_QUERY_OVERRIDES[value];
  const label = VIBE_LABELS.get(value);
  return label ? label.toLowerCase() : null;
}

interface BuildSurpriseQueryOptions {
  /** Index picker over a candidate pool of length n. Injectable for tests. */
  pick?: (n: number) => number;
}

/**
 * Builds ONE search query string from the user's saved preferences.
 *
 * Strategy:
 * 1. Prefer music genres (most query-friendly) — map values → readable labels.
 * 2. Otherwise use a vibe term.
 * 3. If the user has no usable preferences, fall back to a random preset.
 *
 * The `pick` option makes selection deterministic for tests.
 */
export function buildSurpriseQuery(
  prefs: UserPreferences,
  opts: BuildSurpriseQueryOptions = {},
): string {
  const pick = opts.pick ?? ((n: number) => Math.floor(Math.random() * n));

  const musicCandidates = (prefs.music_genres ?? [])
    .map(musicTerm)
    .filter((t): t is string => t !== null);

  if (musicCandidates.length > 0) {
    return musicCandidates[pick(musicCandidates.length)];
  }

  const vibeCandidates = (prefs.vibes ?? [])
    .map(vibeTerm)
    .filter((t): t is string => t !== null);

  if (vibeCandidates.length > 0) {
    return vibeCandidates[pick(vibeCandidates.length)];
  }

  return SURPRISE_PRESETS[pick(SURPRISE_PRESETS.length)];
}
