"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InterestSelector } from "@/features/onboarding/components/interest-selector";
import {
  setPreferences,
  completeOnboarding,
} from "@/features/onboarding/services/preferences.service";
import {
  LOOKING_FOR_OPTIONS,
  type LookingFor,
} from "@/features/onboarding/types/preferences.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForYouOnboardingProps {
  /** Called when the user finishes or skips all steps */
  onComplete: () => void;
}

// ─── Step constants ───────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

// Step transition variants — slide left on advance, right on back
const stepVariants = {
  enter: (dir: 1 | -1) => ({
    x: dir * 40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: 1 | -1) => ({
    x: dir * -40,
    opacity: 0,
  }),
};

const stepTransition = {
  type: "spring" as const,
  stiffness: 340,
  damping: 30,
  mass: 0.85,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Looking-for chip used in Step 2 */
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

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 w-full max-w-[200px] mx-auto mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-[2px] rounded-full transition-colors duration-300"
          style={{
            backgroundColor:
              i < step
                ? "#39FF14"
                : i === step
                  ? "rgba(57,255,20,0.4)"
                  : "rgba(255,255,255,0.12)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ForYouOnboarding({ onComplete }: ForYouOnboardingProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Collected data — accumulated across steps; not lost when skipping
  // Note: interests (Step 0) are persisted by InterestSelector internally
  // via useInterests.save() when the user taps "Guardar intereses". We do NOT
  // call setMyInterests again in finish() to avoid a double-write.
  const [selectedLookingFor, setSelectedLookingFor] = useState<LookingFor[]>([]);
  const [likesText, setLikesText] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Navigation ───────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  // ── Persist & finish ─────────────────────────────────────────────────────

  const finish = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Persist preferences (looking_for + likes) — only if any set
      const hasPrefs =
        selectedLookingFor.length > 0 || likesText.trim().length > 0;
      if (hasPrefs) {
        await setPreferences({
          looking_for: selectedLookingFor.length > 0 ? selectedLookingFor : undefined,
          likes: likesText.trim() || undefined,
        });
      }
      // Mark onboarding done regardless of what was entered
      await completeOnboarding();
    } catch {
      // Non-critical — still call onComplete to dismiss
    } finally {
      setSaving(false);
      onComplete();
    }
  }, [saving, selectedLookingFor, likesText, onComplete]);

  // Skip a single step: advance without persisting that step's data
  const handleSkipStep = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      goNext();
    } else {
      void finish();
    }
  }, [step, goNext, finish]);

  // "Saltar todo" skips everything and calls finish immediately
  const handleSkipAll = useCallback(() => {
    void finish();
  }, [finish]);

  // "Continuar" — advance and on last step persist + finish
  const handleContinue = useCallback(async () => {
    if (step < TOTAL_STEPS - 1) {
      goNext();
    } else {
      await finish();
    }
  }, [step, goNext, finish]);

  // ── Toggle looking-for chip ──────────────────────────────────────────────

  const toggleLookingFor = useCallback((value: LookingFor) => {
    setSelectedLookingFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }, []);

  // ── Step labels ──────────────────────────────────────────────────────────

  const stepLabels = ["Intereses", "¿Qué buscás?", "¿Qué te gusta?"];

  // ── Render ───────────────────────────────────────────────────────────────

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

      {/* Top bar: progress label + Saltar */}
      <div className="flex items-center justify-between px-5 pt-safe-top pt-6 pb-2 flex-shrink-0">
        <span className="text-[10px] uppercase tracking-[0.2em] text-cave-smoke font-[family-name:var(--font-space-mono)]">
          {stepLabels[step]}
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
        <div className="border-l-2 border-[#39FF14]/60 pl-3 mb-1">
          <h1 className="text-xl font-[family-name:var(--font-space-mono)] font-bold text-cave-white leading-tight tracking-tight">
            Armá tu For You
          </h1>
        </div>
        <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)] pl-3 border-l-2 border-transparent">
          Paso {step + 1} de {TOTAL_STEPS} · opcional
        </p>
      </div>

      {/* Progress bar */}
      <div className="px-5 flex-shrink-0">
        <ProgressBar step={step} />
      </div>

      {/* Step content — scrollable */}
      <div className="flex-1 overflow-hidden relative">
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
            {/* ── Step 0: Intereses ────────────────────────────────────── */}
            {step === 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-cave-fog">
                  Elegí las categorías que más te interesan — así tu feed tiene más onda.
                </p>
                {/* "Guardar y seguir" persists the selected interests and then
                    advances, so no selection is ever lost. The footer Continuar
                    is hidden on this step to avoid a confusing second button. */}
                <InterestSelectorStep onSaved={goNext} />
              </div>
            )}

            {/* ── Step 1: ¿Qué buscás? ────────────────────────────────── */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-cave-fog">
                  ¿Para qué usás CAVES? Podés elegir más de una opción.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {LOOKING_FOR_OPTIONS.map((opt) => (
                    <LookingForChip
                      key={opt.value}
                      label={opt.label}
                      active={selectedLookingFor.includes(opt.value)}
                      onClick={() => toggleLookingFor(opt.value)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 2: ¿Qué te gusta? ──────────────────────────────── */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-cave-fog">
                  Contanos qué géneros, ambientes o experiencias te mandan. Libre y sin filtros.
                </p>
                <textarea
                  value={likesText}
                  onChange={(e) => setLikesText(e.target.value)}
                  placeholder="ej. techno, bailes de salsa, after underground, rooftops tranquis…"
                  rows={5}
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
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0 px-5 pb-safe-bottom pb-8 pt-3 flex flex-col gap-2.5 border-t border-cave-ash/30">
        {/* Step 0 advances via InterestSelector's own "Guardar y seguir" CTA;
            other steps use this footer button. */}
        {step > 0 && (
          <motion.button
            onClick={handleContinue}
            disabled={saving}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="
              min-h-[48px] w-full rounded-full
              bg-[#39FF14] text-cave-black text-sm font-medium
              font-[family-name:var(--font-space-mono)]
              shadow-[0_0_16px_rgba(57,255,20,0.2)]
              disabled:opacity-50 transition-opacity
              hover:brightness-110 active:brightness-95
            "
          >
            {saving
              ? "Guardando..."
              : step < TOTAL_STEPS - 1
                ? "Continuar"
                : "Listo"}
          </motion.button>
        )}

        <button
          onClick={handleSkipStep}
          disabled={saving}
          className="
            min-h-[44px] w-full text-xs text-cave-smoke hover:text-cave-fog
            transition-colors font-[family-name:var(--font-space-mono)] disabled:opacity-40
          "
        >
          Saltar este paso
        </button>
      </div>
    </div>
  );
}

// ─── InterestSelectorStep wrapper ────────────────────────────────────────────
/**
 * Wraps InterestSelector to give it the "Continuar" CTA style used in the
 * onboarding flow while still persisting via the existing service.
 * The `onSaved` callback fires after a successful save (if the user taps
 * the CTA embedded inside InterestSelector before tapping Continuar).
 * The outer ForYouOnboarding does NOT call setMyInterests directly —
 * InterestSelector already does it internally.
 */
function InterestSelectorStep({ onSaved }: { onSaved: () => void }) {
  // "Guardar y seguir" persists the selected interests via InterestSelector's
  // internal useInterests.save() and then advances (onSave fires after a
  // successful save) — so tapping it never loses the user's selection.
  return (
    <InterestSelector
      ctaLabel="Guardar y seguir"
      onSave={onSaved}
    />
  );
}
