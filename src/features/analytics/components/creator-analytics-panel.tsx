"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCreatorAnalytics } from "@/features/analytics/hooks/use-creator-analytics";
import { AnalyticsTotalsRow } from "@/features/analytics/components/analytics-totals-row";
import { FlyerAnalyticsRow } from "@/features/analytics/components/flyer-analytics-row";

// ─── Creator analytics panel ─────────────────────────────────────────────────
// Shows the CURRENT user's flyer metrics. Requires auth — redirects to
// /auth/login once we know there is no session.
export function CreatorAnalyticsPanel() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data, loading, error } = useCreatorAnalytics(user?.id);

  // Redirect unauthenticated users once auth has resolved.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
    }
  }, [authLoading, user, router]);

  const busy = authLoading || (!!user && loading);

  return (
    <div className="min-h-dvh bg-cave-black">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* ── Header: back arrow left, centered logo ──────────────────────────── */}
      <header className="sticky top-0 z-40 relative flex items-center justify-between px-4 py-3 bg-cave-black/80 backdrop-blur-md safe-area-top">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Volver"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <Link href="/" aria-label="Caves" className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <Image
            src="/Logo.png"
            alt="Caves"
            width={92}
            height={33}
            className="h-auto w-[92px]"
            priority
          />
        </Link>

        <div className="w-10" />
      </header>

      <div className="mx-auto w-full max-w-[760px] px-4 sm:px-6 pb-12">
        <h1 className="mt-5 text-xl sm:text-2xl text-cave-white font-[family-name:var(--font-space-mono)] font-bold tracking-tight">
          Tus estadísticas
        </h1>
        <p className="mt-1 text-sm text-cave-fog font-[family-name:var(--font-inter)]">
          El rendimiento de los flyers que publicaste.
        </p>

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {busy && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cave-fog border-t-cave-white rounded-full animate-spin" />
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {!busy && error && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)]">
              {error}
            </p>
          </div>
        )}

        {/* ── Content ───────────────────────────────────────────────────────── */}
        {!busy && !error && data && (
          <>
            <div className="mt-6">
              <AnalyticsTotalsRow totals={data.totals} />
            </div>

            <div className="mt-8">
              <h2 className="text-xs uppercase tracking-[0.16em] text-cave-smoke font-[family-name:var(--font-space-mono)]">
                Por flyer
              </h2>

              {data.flyers.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-cave-ash/60 bg-cave-dark/40 px-6 py-12 text-center">
                  <p className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)]">
                    Todavía no publicaste flyers
                  </p>
                  <Link
                    href="/"
                    className="rounded-full bg-cave-white text-cave-black px-5 py-2 text-sm font-medium"
                  >
                    Publicar un flyer
                  </Link>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {data.flyers.map((flyer) => (
                    <FlyerAnalyticsRow key={flyer.id} flyer={flyer} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
