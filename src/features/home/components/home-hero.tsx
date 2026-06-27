"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ForYouOnboarding } from "@/features/onboarding/components/for-you-onboarding";
import {
  getOnboardingState,
  getPreferences,
} from "@/features/onboarding/services/preferences.service";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { parseIntent } from "../services/parse-intent";
import { buildSurpriseQuery } from "../services/build-surprise-query";

export function HomeHero() {
  const router = useRouter();
  const { user } = useAuth();
  const [value, setValue] = useState("");
  const [showTest, setShowTest] = useState(false);
  const [pendingSurprise, setPendingSurprise] = useState(false);
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  function goToExplore(rawText: string) {
    const { query } = parseIntent(rawText);
    const q = query || rawText.trim();
    if (!q) return;
    router.push(`/explorar?q=${encodeURIComponent(q)}`);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    goToExplore(value);
  }

  /** Resolve saved preferences → personalized query → navigate to /explorar. */
  async function runSurprise() {
    const prefs = await getPreferences(user!.id);
    const q = buildSurpriseQuery(prefs);
    router.push(`/explorar?q=${encodeURIComponent(q)}`);
  }

  async function handleSurprise() {
    if (surpriseLoading) return; // guard double-taps

    // Not logged in → send to sign in.
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setSurpriseLoading(true);
    try {
      const state = await getOnboardingState(user.id);
      if (!state.completed) {
        // Gate: require the gustos test first; run surprise once it finishes.
        setPendingSurprise(true);
        setShowTest(true);
        return;
      }
      await runSurprise();
    } finally {
      setSurpriseLoading(false);
    }
  }

  return (
    <section className="relative flex min-h-[82dvh] flex-col items-center justify-center px-5 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-xl flex-col items-center"
      >
        <Image
          src="/Logo.png"
          alt="Caves"
          width={160}
          height={58}
          priority
          className="h-auto w-[140px] sm:w-[160px]"
        />

        <h1 className="mt-8 font-[family-name:var(--font-space-mono)] text-3xl font-bold leading-tight text-white sm:text-4xl">
          ¿Qué quieres hacer hoy?
        </h1>

        {/* Search */}
        <form onSubmit={handleSubmit} className="mt-10 w-full">
          <div className="flex items-center gap-2 rounded-full border border-cave-ash bg-cave-stone/70 p-2 focus-within:border-white/60 transition-colors">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ej. Quiero ir a bailar salsa mañana"
              aria-label="Buscar planes"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-cave-fog focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform active:scale-95"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </form>

        {/* Secondary actions */}
        <div className="mt-5 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleSurprise}
            disabled={surpriseLoading}
            aria-busy={surpriseLoading}
            className="flex items-center gap-2 rounded-full border border-cave-ash bg-cave-rock px-5 py-2.5 font-[family-name:var(--font-space-mono)] text-xs uppercase tracking-wider text-white transition-colors hover:bg-cave-ash active:scale-95 disabled:opacity-60"
          >
            <span aria-hidden className={surpriseLoading ? "animate-pulse" : ""}>
              ✦
            </span>
            Sorpréndeme
          </button>

          <button
            type="button"
            onClick={() => setShowTest(true)}
            className="font-[family-name:var(--font-space-mono)] text-xs uppercase tracking-wider text-cave-fog underline-offset-4 transition-colors hover:text-white hover:underline active:scale-95"
          >
            Genera el test de gustos
          </button>
        </div>
      </motion.div>

      {/* Re-takable gustos test — manual overlay (independent of ForYouGate). */}
      <AnimatePresence>
        {showTest && (
          <ForYouOnboarding
            onComplete={() => {
              setShowTest(false);
              // Test opened via "Sorpréndeme" → run the personalized search now.
              // Opened via "Genera el test" → pendingSurprise is false, just close.
              if (pendingSurprise) {
                setPendingSurprise(false);
                void runSurprise();
              }
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
