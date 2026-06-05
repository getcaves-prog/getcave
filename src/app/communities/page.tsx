"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLocationStore } from "@/shared/stores/location.store";
import { useCommunitySearch } from "@/features/communities/hooks/use-community-search";
import type { Community } from "@/features/communities/types/community.types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMemberCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── CommunityCard ─────────────────────────────────────────────────────────

function CommunityCard({ community }: { community: Community }) {
  return (
    <Link href={`/communities/${community.slug}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cave-stone/60 border border-cave-ash/40 hover:border-cave-ash/70 active:border-[#FFFFFF]/30 transition-colors"
      >
        {/* Avatar */}
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-cave-stone flex-shrink-0 ring-1 ring-cave-ash/40">
          {community.avatar_url ? (
            <Image
              src={community.avatar_url}
              alt={community.name}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-cave-smoke"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-cave-white font-[family-name:var(--font-space-mono)] truncate">
              {community.name}
            </p>
            {community.is_seeded && (
              <span className="flex-shrink-0 text-[9px] font-[family-name:var(--font-space-mono)] text-cave-smoke border border-cave-smoke/50 rounded px-1 py-0.5 leading-none">
                No oficial
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {community.city && (
              <span className="text-[11px] text-cave-smoke font-[family-name:var(--font-space-mono)] flex items-center gap-1">
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {community.city}
              </span>
            )}
            <span className="text-[11px] text-cave-smoke font-[family-name:var(--font-space-mono)]">
              {formatMemberCount(community.member_count ?? 0)} miembros
            </span>
          </div>
          {community.description && (
            <p className="text-xs text-cave-fog mt-1 line-clamp-1 font-[family-name:var(--font-inter)]">
              {community.description}
            </p>
          )}
        </div>

        {/* Arrow */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cave-ash flex-shrink-0"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </motion.div>
    </Link>
  );
}

// ─── SkeletonCard ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return <div className="h-[76px] rounded-xl bg-cave-stone/40 animate-pulse" />;
}

// ─── SectionHeading ────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold text-cave-smoke font-[family-name:var(--font-space-mono)] tracking-widest uppercase mb-3">
      {children}
    </h2>
  );
}

// ─── CommunitiesPage ───────────────────────────────────────────────────────

export default function CommunitiesPage() {
  const { user } = useAuth();
  const { locationName } = useLocationStore();

  // Derive city from locationName (e.g. "Buenos Aires, AR" → "Buenos Aires")
  const city = locationName?.split(",")[0]?.trim() ?? undefined;

  const {
    query,
    setQuery,
    isSearching,
    searchResults,
    searchLoading,
    searchError,
    recommended,
    popular,
    defaultLoading,
    defaultError,
  } = useCommunitySearch({ userId: user?.id, city });

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-dvh bg-[#050505]">
      <div className="grain-overlay" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#050505]/80 backdrop-blur-md safe-area-top border-b border-cave-ash/20">
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Volver"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <span className="font-[family-name:var(--font-space-mono)] text-sm text-cave-white tracking-wide">
          Comunidades
        </span>

        {/* Create button */}
        <Link
          href={user ? "/communities/new" : "/auth/login"}
          className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Crear comunidad"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </header>

      <div className="px-4 py-5 max-w-3xl mx-auto">
        {/* Hero copy */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-cave-white font-[family-name:var(--font-space-mono)] tracking-tight mb-1">
            Comunidades
          </h1>
          <p className="text-sm text-cave-fog font-[family-name:var(--font-inter)] leading-5">
            Encontrá tu tribu, organizate con tu crew.
          </p>
        </div>

        {/* Search input */}
        <div className="relative mb-5">
          <label
            htmlFor="community-search"
            className="sr-only"
          >
            Buscar comunidades
          </label>
          {/* Search icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cave-smoke pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            ref={inputRef}
            id="community-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar comunidades..."
            autoComplete="off"
            className={[
              "w-full h-11 pl-9 pr-10 rounded-xl",
              "bg-cave-stone/60 border border-cave-ash/40",
              "text-sm text-cave-white placeholder:text-cave-smoke",
              "font-[family-name:var(--font-space-mono)]",
              "outline-none",
              "focus:border-[#FFFFFF]/60 focus:ring-1 focus:ring-[#FFFFFF]/20",
              "transition-colors",
            ].join(" ")}
          />

          {/* Clear button */}
          <AnimatePresence>
            {query.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.12 }}
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 text-cave-smoke hover:text-cave-white transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── SEARCH MODE ── */}
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SectionHeading>Resultados</SectionHeading>

              {searchLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : searchError ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
                    {searchError}
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-cave-smoke font-[family-name:var(--font-space-mono)] leading-6">
                    No encontramos comunidades
                    <br />
                    con ese nombre.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {searchResults.map((c) => (
                    <CommunityCard key={c.id} community={c} />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            /* ── DEFAULT BROWSE MODE ── */
            <motion.div
              key="browse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Create CTA card */}
              <Link href={user ? "/communities/new" : "/auth/login"}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-cave-smoke hover:border-cave-light transition-colors mb-6"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-cave-smoke flex items-center justify-center flex-shrink-0">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-cave-light"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-cave-light font-[family-name:var(--font-space-mono)]">
                      Crear comunidad
                    </p>
                    <p className="text-xs text-cave-fog font-[family-name:var(--font-inter)]">
                      Empezá tu propia comunidad
                    </p>
                  </div>
                </motion.div>
              </Link>

              {defaultLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : defaultError ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
                    {defaultError}
                  </p>
                </div>
              ) : (
                <>
                  {/* Para vos */}
                  {recommended.length > 0 && (
                    <section className="mb-6">
                      <SectionHeading>Para vos</SectionHeading>
                      <div className="flex flex-col gap-2">
                        {recommended.map((c) => (
                          <CommunityCard key={c.id} community={c} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Populares */}
                  <section>
                    <SectionHeading>Populares</SectionHeading>
                    {popular.length === 0 ? (
                      <div className="py-10 text-center">
                        <p className="text-sm text-cave-smoke font-[family-name:var(--font-space-mono)] leading-6">
                          Todavía no hay comunidades.
                          <br />
                          ¡Creá la primera!
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {popular.map((c) => (
                          <CommunityCard key={c.id} community={c} />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-8 safe-area-bottom" />
    </div>
  );
}
