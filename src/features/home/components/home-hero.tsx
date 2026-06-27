"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { parseIntent } from "../services/parse-intent";

/** Preset queries the "Sorpréndeme" button picks from at random. */
const SURPRISE_QUERIES = [
  "bailar salsa",
  "concierto rock",
  "expo de arte",
  "rave techno",
  "stand up comedy",
  "fiesta electrónica",
  "festival gastronómico",
  "mercado de diseño",
];

export function HomeHero() {
  const router = useRouter();
  const [value, setValue] = useState("");

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

  function handleSurprise() {
    const pick =
      SURPRISE_QUERIES[Math.floor(Math.random() * SURPRISE_QUERIES.length)];
    goToExplore(pick);
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
            className="flex items-center gap-2 rounded-full border border-cave-ash bg-cave-rock px-5 py-2.5 font-[family-name:var(--font-space-mono)] text-xs uppercase tracking-wider text-white transition-colors hover:bg-cave-ash active:scale-95"
          >
            <span aria-hidden>✦</span>
            Sorpréndeme
          </button>
        </div>
      </motion.div>
    </section>
  );
}
