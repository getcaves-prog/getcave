"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { InterestSelector } from "@/features/onboarding/components/interest-selector";
import { ForYouOnboarding } from "@/features/onboarding/components/for-you-onboarding";
import {
  getPreferences,
  setPreferences,
  completeOnboarding,
} from "@/features/onboarding/services/preferences.service";
import {
  LOOKING_FOR_OPTIONS,
  type LookingFor,
  type UserPreferences,
} from "@/features/onboarding/types/preferences.types";
import { SectionHeading } from "@/shared/components/ui/section-heading";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForYouEditorProps {
  /** Optional — pre-loaded preferences to avoid a redundant fetch */
  initialPreferences?: UserPreferences;
}

// ─── Looking-for chip ─────────────────────────────────────────────────────────

function LookingForChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      aria-pressed={active}
      className={[
        "min-h-[48px] flex items-center justify-center px-4 py-3 rounded-xl border",
        "text-sm font-[family-name:var(--font-space-mono)] transition-colors",
        active
          ? "bg-[#39FF14]/10 border-[#39FF14] text-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.15)]"
          : "bg-cave-rock/60 border-cave-ash text-cave-fog hover:border-cave-fog hover:text-cave-white",
      ].join(" ")}
    >
      {label}
    </motion.button>
  );
}

// ─── ForYouEditor ─────────────────────────────────────────────────────────────

export function ForYouEditor({ initialPreferences }: ForYouEditorProps) {
  const [lookingFor, setLookingFor] = useState<LookingFor[]>(
    initialPreferences?.looking_for ?? []
  );
  const [likesText, setLikesText] = useState(
    initialPreferences?.likes ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redonboarding, setRedonboarding] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(!initialPreferences);

  // Load preferences if not provided upfront
  useEffect(() => {
    if (initialPreferences) return;
    let cancelled = false;

    async function load() {
      setLoadingPrefs(true);
      try {
        const prefs = await getPreferences();
        if (!cancelled) {
          setLookingFor(prefs.looking_for ?? []);
          setLikesText(prefs.likes ?? "");
        }
      } catch {
        // Non-critical — leave empty
      } finally {
        if (!cancelled) setLoadingPrefs(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [initialPreferences]);

  const toggleLookingFor = useCallback((value: LookingFor) => {
    setLookingFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await setPreferences({
        looking_for: lookingFor.length > 0 ? lookingFor : undefined,
        likes: likesText.trim() || undefined,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando preferencias");
    } finally {
      setSaving(false);
    }
  }, [lookingFor, likesText]);

  // Re-open the full onboarding flow to redo everything
  const handleRedoOnboarding = useCallback(async () => {
    // Reset the DB flag so the gate doesn't think it's already done
    // We call completeOnboarding again after the re-run finishes.
    // For simplicity we just open the flow inline; it will call completeOnboarding on finish.
    setRedonboarding(true);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setRedonboarding(false);
    // Reload preferences from DB
    setLoadingPrefs(true);
    getPreferences().then((prefs) => {
      setLookingFor(prefs.looking_for ?? []);
      setLikesText(prefs.likes ?? "");
      setLoadingPrefs(false);
    }).catch(() => setLoadingPrefs(false));
  }, []);

  if (redonboarding) {
    return (
      <ForYouOnboarding
        onComplete={handleOnboardingComplete}
      />
    );
  }

  if (loadingPrefs) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cave-fog border-t-[#39FF14] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Section: Intereses */}
      <section className="flex flex-col gap-3">
        <SectionHeading>Mis intereses</SectionHeading>
        <InterestSelector ctaLabel="Guardar intereses" />
      </section>

      {/* Divider */}
      <div className="h-px bg-cave-ash/40" />

      {/* Section: ¿Qué buscás? */}
      <section className="flex flex-col gap-3">
        <SectionHeading>¿Qué buscás en CAVES?</SectionHeading>
        <div className="grid grid-cols-2 gap-2.5">
          {LOOKING_FOR_OPTIONS.map((opt) => (
            <LookingForChip
              key={opt.value}
              label={opt.label}
              active={lookingFor.includes(opt.value)}
              onClick={() => toggleLookingFor(opt.value)}
            />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-cave-ash/40" />

      {/* Section: ¿Qué te gusta? */}
      <section className="flex flex-col gap-3">
        <SectionHeading>¿Qué te gusta?</SectionHeading>
        <p className="text-xs text-cave-fog">
          Géneros, ambientes, lo que sea. Sin filtros.
        </p>
        <textarea
          value={likesText}
          onChange={(e) => {
            setLikesText(e.target.value);
            setSaved(false);
          }}
          placeholder="ej. techno, bailes de salsa, after underground, rooftops tranquis…"
          rows={4}
          maxLength={500}
          className="
            w-full bg-cave-rock/60 border border-cave-ash rounded-xl
            px-4 py-3 text-sm text-cave-white
            font-[family-name:var(--font-space-mono)]
            placeholder:text-cave-smoke
            focus:outline-none focus:border-[#39FF14]/50 focus:shadow-[0_0_12px_rgba(57,255,20,0.08)]
            resize-none transition-colors leading-relaxed
          "
        />
        <p className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)] text-right">
          {likesText.length}/500
        </p>
      </section>

      {/* Error */}
      {error && (
        <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
          {error}
        </p>
      )}

      {/* Save preferences button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="
          min-h-[48px] w-full rounded-full
          bg-[#39FF14] text-cave-black text-sm font-medium
          font-[family-name:var(--font-space-mono)]
          shadow-[0_0_16px_rgba(57,255,20,0.2)]
          disabled:opacity-50 transition-opacity
          hover:brightness-110 active:brightness-95
        "
      >
        {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar preferencias"}
      </button>

      {/* Redo onboarding */}
      <div className="flex items-center justify-center pt-1">
        <button
          onClick={handleRedoOnboarding}
          className="
            flex items-center gap-1.5 text-xs text-cave-smoke hover:text-cave-fog
            transition-colors font-[family-name:var(--font-space-mono)]
          "
          aria-label="Rehacer onboarding"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
          </svg>
          Rehacer onboarding
        </button>
      </div>
    </div>
  );
}
