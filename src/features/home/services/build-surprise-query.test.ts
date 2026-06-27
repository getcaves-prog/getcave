import { describe, it, expect } from "vitest";
import { buildSurpriseQuery, SURPRISE_PRESETS } from "./build-surprise-query";
import type { UserPreferences } from "@/features/onboarding/types/preferences.types";

describe("buildSurpriseQuery", () => {
  it("returns a music genre label when music_genres are present", () => {
    const prefs: UserPreferences = { music_genres: ["techno"] };
    // pick=0 → first (only) candidate
    expect(buildSurpriseQuery(prefs, { pick: () => 0 })).toBe("techno");
  });

  it("maps option values to readable labels (salsa_bachata → salsa)", () => {
    const prefs: UserPreferences = { music_genres: ["salsa_bachata"] };
    expect(buildSurpriseQuery(prefs, { pick: () => 0 })).toBe("salsa");
  });

  it("maps reggaeton → reggaetón", () => {
    const prefs: UserPreferences = { music_genres: ["reggaeton"] };
    expect(buildSurpriseQuery(prefs, { pick: () => 0 })).toBe("reggaetón");
  });

  it("prefers music genres over vibes when both are present", () => {
    const prefs: UserPreferences = {
      music_genres: ["rock"],
      vibes: ["under"],
    };
    expect(buildSurpriseQuery(prefs, { pick: () => 0 })).toBe("rock");
  });

  it("uses a vibe term when only vibes are present (no music)", () => {
    const prefs: UserPreferences = { vibes: ["cultural"] };
    const result = buildSurpriseQuery(prefs, { pick: () => 0 });
    // cultural → "arte" / "cultural" — must be a non-empty readable term
    expect(result.length).toBeGreaterThan(0);
    expect(SURPRISE_PRESETS).not.toContain(result);
  });

  it("falls back to a preset when there are no usable preferences", () => {
    const prefs: UserPreferences = {};
    expect(buildSurpriseQuery(prefs, { pick: () => 0 })).toBe(SURPRISE_PRESETS[0]);
  });

  it("falls back to a preset when music/vibes are empty arrays", () => {
    const prefs: UserPreferences = { music_genres: [], vibes: [] };
    expect(buildSurpriseQuery(prefs, { pick: () => 2 })).toBe(SURPRISE_PRESETS[2]);
  });

  it("is deterministic via opts.pick (selects candidate by index)", () => {
    const prefs: UserPreferences = { music_genres: ["techno", "house", "rock"] };
    expect(buildSurpriseQuery(prefs, { pick: () => 1 })).toBe("house");
    expect(buildSurpriseQuery(prefs, { pick: () => 2 })).toBe("rock");
  });

  it("ignores unknown music values and falls back when none are usable", () => {
    const prefs: UserPreferences = { music_genres: ["__nope__"] };
    expect(buildSurpriseQuery(prefs, { pick: () => 0 })).toBe(SURPRISE_PRESETS[0]);
  });
});
