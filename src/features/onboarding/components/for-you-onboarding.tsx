"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InterestSelector } from "@/features/onboarding/components/interest-selector";
import {
  setPreferences,
  setCity,
  getPreferences,
  getCity,
  completeOnboarding,
} from "@/features/onboarding/services/preferences.service";
import {
  LOOKING_FOR_OPTIONS,
  MUSIC_OPTIONS,
  VIBE_OPTIONS,
  COMPANY_OPTIONS,
  TIMING_OPTIONS,
  type LookingFor,
  type UserPreferences,
} from "@/features/onboarding/types/preferences.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForYouOnboardingProps {
  /** Called when the user finishes or skips all steps */
  onComplete: () => void;
  /**
   * Optional pre-loaded preferences (re-take / edit). When omitted the modal
   * fetches them itself so chips render already selected.
   */
  initialPreferences?: UserPreferences;
  /** Optional pre-loaded city (re-take / edit). */
  initialCity?: string | null;
  /**
   * When true, the modal fetches current prefs + city on mount to pre-fill
   * (used for the manual "re-take" entry points). First-login can leave this
   * off — there's nothing to pre-fill. Defaults to true; harmless either way.
   */
  prefill?: boolean;
}

// ─── Step constants ───────────────────────────────────────────────────────────

const TOTAL_STEPS = 7;

const STEP_LABELS = [
  "Intereses",
  "Música",
  "Vibe",
  "¿Con quién salís?",
  "¿Cuándo?",
  "¿De dónde sos?",
  "Algo libre",
];

// Step transition variants — slide left on advance, right on back
const stepVariants = {
  enter: (dir: 1 | -1) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: 1 | -1) => ({ x: dir * -40, opacity: 0 }),
};

const stepTransition = {
  type: "spring" as const,
  stiffness: 340,
  damping: 30,
  mass: 0.85,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Generic multi-select chip (white + grays, Space Mono, no green). */
function Chip({
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
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      aria-pressed={active}
      className={[
        "min-h-[48px] flex items-center justify-center px-4 py-3 rounded-xl border",
        "text-sm font-[family-name:var(--font-space-mono)] transition-colors",
        active
          ? "bg-[#FFFFFF]/10 border-[#FFFFFF] text-[#FFFFFF] shadow-[0_0_12px_rgba(255,255,255,0.15)]"
          : "bg-cave-rock/60 border-cave-ash text-cave-fog hover:border-cave-fog hover:text-cave-white",
      ].join(" ")}
    >
      {label}
    </motion.button>
  );
}

/** A grid of multi-select chips bound to a string[] state. */
function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          active={selected.includes(opt.value)}
          onClick={() => onToggle(opt.value)}
        />
      ))}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 w-full max-w-[280px] mx-auto mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-[2px] rounded-full transition-colors duration-300"
          style={{
            backgroundColor:
              i < step
                ? "#FFFFFF"
                : i === step
                  ? "rgba(255,255,255,0.4)"
                  : "rgba(255,255,255,0.12)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ForYouOnboarding({
  onComplete,
  initialPreferences,
  initialCity,
  prefill = true,
}: ForYouOnboardingProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Collected data — accumulated across steps; never lost when skipping.
  // Interests (Step 0) are persisted by InterestSelector itself via
  // useInterests.save() — we do NOT re-write them in finish().
  const [musicGenres, setMusicGenres] = useState<string[]>(
    initialPreferences?.music_genres ?? []
  );
  const [vibes, setVibes] = useState<string[]>(initialPreferences?.vibes ?? []);
  const [company, setCompany] = useState<string[]>(
    initialPreferences?.company ?? []
  );
  const [timing, setTiming] = useState<string[]>(
    initialPreferences?.timing ?? []
  );
  const [city, setCityValue] = useState<string>(initialCity ?? "");
  const [selectedLookingFor, setSelectedLookingFor] = useState<LookingFor[]>(
    initialPreferences?.looking_for ?? []
  );
  const [likesText, setLikesText] = useState(initialPreferences?.likes ?? "");
  const [saving, setSaving] = useState(false);

  // ── Prefill on re-take (when nothing was passed explicitly) ───────────────
  useEffect(() => {
    if (!prefill || initialPreferences) return;
    let cancelled = false;
    async function load() {
      try {
        const [prefs, storedCity] = await Promise.all([
          getPreferences(),
          getCity().catch(() => null),
        ]);
        if (cancelled) return;
        setMusicGenres(prefs.music_genres ?? []);
        setVibes(prefs.vibes ?? []);
        setCompany(prefs.company ?? []);
        setTiming(prefs.timing ?? []);
        setSelectedLookingFor(prefs.looking_for ?? []);
        setLikesText(prefs.likes ?? "");
        if (storedCity) setCityValue(storedCity);
      } catch {
        // Non-critical — leave blanks
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle helper for string[] chip groups ────────────────────────────────
  function toggleIn(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const toggleMusic = useCallback(
    (v: string) => toggleIn(setMusicGenres, v),
    []
  );
  const toggleVibe = useCallback((v: string) => toggleIn(setVibes, v), []);
  const toggleCompany = useCallback((v: string) => toggleIn(setCompany, v), []);
  const toggleTiming = useCallback((v: string) => toggleIn(setTiming, v), []);

  const toggleLookingFor = useCallback((value: LookingFor) => {
    setSelectedLookingFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  // ── Persist & finish ───────────────────────────────────────────────────────
  const finish = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const prefs: UserPreferences = {
        music_genres: musicGenres.length > 0 ? musicGenres : undefined,
        vibes: vibes.length > 0 ? vibes : undefined,
        company: company.length > 0 ? company : undefined,
        timing: timing.length > 0 ? timing : undefined,
        looking_for:
          selectedLookingFor.length > 0 ? selectedLookingFor : undefined,
        likes: likesText.trim() || undefined,
      };
      const hasPrefs = Object.values(prefs).some((v) => v !== undefined);
      if (hasPrefs) await setPreferences(prefs);
      if (city.trim()) await setCity(city);
      await completeOnboarding();
    } catch {
      // Non-critical — still dismiss
    } finally {
      setSaving(false);
      onComplete();
    }
  }, [
    saving,
    musicGenres,
    vibes,
    company,
    timing,
    selectedLookingFor,
    likesText,
    city,
    onComplete,
  ]);

  // Skip current step: advance without losing prior data; finish on last step.
  const handleSkipStep = useCallback(() => {
    if (step < TOTAL_STEPS - 1) goNext();
    else void finish();
  }, [step, goNext, finish]);

  // "Saltar todo" — jump straight to finishing.
  const handleSkipAll = useCallback(() => {
    void finish();
  }, [finish]);

  // "Continuar" — advance, or on last step persist + finish.
  const handleContinue = useCallback(async () => {
    if (step < TOTAL_STEPS - 1) goNext();
    else await finish();
  }, [step, goNext, finish]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(10,10,10,0.97) 0%, rgba(0,0,0,0.99) 100%)",
        WebkitBackdropFilter: "blur(40px)",
        backdropFilter: "blur(40px)",
      }}
    >
      {/* Grain texture */}
      <div className="grain-overlay pointer-events-none" />

      {/* Centering wrapper for desktop */}
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto min-h-0">
        {/* Top bar: step label + Saltar todo */}
        <div className="flex items-center justify-between px-5 pt-safe-top pt-6 pb-2 flex-shrink-0">
          <span className="text-[10px] uppercase tracking-[0.2em] text-cave-smoke font-[family-name:var(--font-space-mono)]">
            Test de gustos
          </span>
          <button
            onClick={handleSkipAll}
            disabled={saving}
            className="text-xs text-cave-smoke hover:text-cave-fog transition-colors font-[family-name:var(--font-space-mono)] disabled:opacity-40"
            aria-label="Saltar todo"
          >
            Saltar todo
          </button>
        </div>

        {/* Header */}
        <div className="px-5 pb-4 flex-shrink-0">
          <div className="border-l-2 border-[#FFFFFF]/60 pl-3 mb-1">
            <h1 className="text-xl font-[family-name:var(--font-space-mono)] font-bold text-cave-white leading-tight tracking-tight">
              Conocete con CAVES
            </h1>
          </div>
          <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)] pl-3">
            {STEP_LABELS[step]} · paso {step + 1} de {TOTAL_STEPS}
          </p>
        </div>

        {/* Progress bar */}
        <div className="px-5 flex-shrink-0">
          <ProgressBar step={step} />
        </div>

        {/* Step content — scrollable */}
        <div className="flex-1 overflow-hidden relative min-h-0">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="absolute inset-0 overflow-y-auto px-5 pb-4"
            >
              {/* ── Step 0: Intereses ───────────────────────────────────── */}
              {step === 0 && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                    Elegí las categorías que más te interesan — así tu feed tiene
                    más onda.
                  </p>
                  {/* InterestSelector persists to user_interests on its own CTA. */}
                  <InterestSelector ctaLabel="Guardar y seguir" onSave={goNext} />
                </div>
              )}

              {/* ── Step 1: Música ──────────────────────────────────────── */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                    ¿Qué sonás? Elegí los géneros que te mueven.
                  </p>
                  <ChipGrid
                    options={MUSIC_OPTIONS}
                    selected={musicGenres}
                    onToggle={toggleMusic}
                  />
                </div>
              )}

              {/* ── Step 2: Vibe ────────────────────────────────────────── */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                    ¿Qué ambiente buscás cuando salís?
                  </p>
                  <ChipGrid
                    options={VIBE_OPTIONS}
                    selected={vibes}
                    onToggle={toggleVibe}
                  />
                </div>
              )}

              {/* ── Step 3: ¿Con quién salís? ───────────────────────────── */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                    ¿Cómo te gusta salir?
                  </p>
                  <ChipGrid
                    options={COMPANY_OPTIONS}
                    selected={company}
                    onToggle={toggleCompany}
                  />
                </div>
              )}

              {/* ── Step 4: ¿Cuándo? ────────────────────────────────────── */}
              {step === 4 && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                    ¿Cuándo solés moverte?
                  </p>
                  <ChipGrid
                    options={TIMING_OPTIONS}
                    selected={timing}
                    onToggle={toggleTiming}
                  />
                </div>
              )}

              {/* ── Step 5: ¿De dónde sos? ──────────────────────────────── */}
              {step === 5 && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                    Tu ciudad o zona — así te mostramos planes cerca.
                  </p>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCityValue(e.target.value)}
                    placeholder="ej. Buenos Aires, Palermo, CDMX…"
                    maxLength={120}
                    autoComplete="off"
                    autoCapitalize="words"
                    className="
                      w-full bg-cave-rock/60 border border-cave-ash rounded-xl
                      px-4 py-3 text-sm text-cave-white
                      font-[family-name:var(--font-space-mono)]
                      placeholder:text-cave-smoke
                      focus:outline-none focus:border-[#FFFFFF]/50 focus:shadow-[0_0_12px_rgba(255,255,255,0.08)]
                      transition-colors
                    "
                  />
                </div>
              )}

              {/* ── Step 6: Algo libre (likes + looking_for) ────────────── */}
              {step === 6 && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                      ¿Para qué usás CAVES? Podés elegir más de una.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {LOOKING_FOR_OPTIONS.map((opt) => (
                        <Chip
                          key={opt.value}
                          label={opt.label}
                          active={selectedLookingFor.includes(opt.value)}
                          onClick={() => toggleLookingFor(opt.value)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                      Algo libre: contanos qué te manda. Sin filtros.
                    </p>
                    <textarea
                      value={likesText}
                      onChange={(e) => setLikesText(e.target.value)}
                      placeholder="ej. techno, bailes de salsa, after underground, rooftops tranquis…"
                      rows={4}
                      maxLength={500}
                      className="
                        w-full bg-cave-rock/60 border border-cave-ash rounded-xl
                        px-4 py-3 text-sm text-cave-white
                        font-[family-name:var(--font-space-mono)]
                        placeholder:text-cave-smoke
                        focus:outline-none focus:border-[#FFFFFF]/50 focus:shadow-[0_0_12px_rgba(255,255,255,0.08)]
                        resize-none transition-colors leading-relaxed
                      "
                    />
                    <p className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)] text-right">
                      {likesText.length}/500
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom actions */}
        <div className="flex-shrink-0 px-5 pb-safe-bottom pb-8 pt-3 flex flex-col gap-2.5 border-t border-cave-ash/30">
          {/* Step 0 advances via InterestSelector's own CTA; the footer
              Continuar is hidden there to avoid two competing buttons. */}
          {step > 0 && (
            <motion.button
              onClick={handleContinue}
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="
                min-h-[48px] w-full rounded-full
                bg-[#FFFFFF] text-cave-black text-sm font-medium
                font-[family-name:var(--font-space-mono)]
                shadow-[0_0_16px_rgba(255,255,255,0.2)]
                disabled:opacity-50 transition-opacity
                hover:brightness-110 active:brightness-95
              "
            >
              {saving ? "Guardando..." : isLast ? "Listo" : "Continuar"}
            </motion.button>
          )}

          <div className="flex items-center justify-between gap-3">
            {step > 0 ? (
              <button
                onClick={goBack}
                disabled={saving}
                className="
                  min-h-[44px] px-2 text-xs text-cave-smoke hover:text-cave-fog
                  transition-colors font-[family-name:var(--font-space-mono)] disabled:opacity-40
                "
              >
                ← Atrás
              </button>
            ) : (
              <span />
            )}

            <button
              onClick={handleSkipStep}
              disabled={saving}
              className="
                min-h-[44px] px-2 text-xs text-cave-smoke hover:text-cave-fog
                transition-colors font-[family-name:var(--font-space-mono)] disabled:opacity-40
              "
            >
              {isLast ? "Saltar y terminar" : "Saltar este paso"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
