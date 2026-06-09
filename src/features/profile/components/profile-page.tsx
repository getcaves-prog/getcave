"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { createClient } from "@/shared/lib/supabase/client";
import { getProfileByUsername } from "@/features/profile/services/profile.service";
import { ProfileEditModal } from "@/features/profile/components/profile-edit-modal";
import { useMyActivity } from "@/features/profile/hooks/use-my-activity";
import { useMyRecaps } from "@/features/profile/hooks/use-my-recaps";
import { getSavedFlyers } from "@/features/canvas/services/favorites.service";
import { ProfileStatsRow } from "@/features/profile/components/profile-stats-row";
import { NoDmsBanner } from "@/features/profile/components/no-dms-banner";
import { OrganizerCtaCard } from "@/features/profile/components/organizer-cta-card";
import { ProfileUpcomingCarousel } from "@/features/profile/components/profile-upcoming-carousel";
import { ProfileCommunitiesCarousel } from "@/features/profile/components/profile-communities-carousel";
import { ProfileRecapsCarousel } from "@/features/profile/components/profile-recaps-carousel";
import { ProfileSettingsDrawer } from "@/features/profile/components/profile-settings-drawer";
import type { Tables } from "@/shared/types/database.types";

type Profile = Pick<
  Tables<"profiles">,
  "id" | "username" | "avatar_url" | "bio" | "city" | "role" | "created_at"
>;

interface ProfilePageProps {
  username: string;
}

export function ProfilePage({ username }: ProfilePageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedFlyers, setSavedFlyers] = useState<Tables<"flyers">[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const isOwnProfile = user?.id === profile?.id;

  // ── Retention data — loaded for the profile being viewed ──────────────────
  const activityData = useMyActivity(profile?.id);
  const { recaps } = useMyRecaps(profile?.id);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setIsAdmin(data?.role === "admin"));
  }, [user]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const profileData = await getProfileByUsername(username);
    setProfile(profileData ?? null);
    setLoading(false);
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Saved flyers — private, own profile only (for the stats tile)
  const own = isOwnProfile;
  useEffect(() => {
    if (!own) return;
    getSavedFlyers().then(setSavedFlyers);
  }, [own]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }, []);

  const handleEditClose = useCallback(() => {
    setEditOpen(false);
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-cave-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cave-fog border-t-cave-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-dvh bg-cave-black flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-cave-fog font-[family-name:var(--font-space-mono)] text-sm">
          Usuario no encontrado
        </p>
        <Link
          href="/"
          className="rounded-full bg-cave-white text-cave-black px-6 py-2.5 text-sm font-medium"
        >
          Volver al canvas
        </Link>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const isOrganizer = activityData.communities.some((c) => c.role === "owner");
  const roleLabel = isOrganizer ? "Organizador" : "Explorador";

  const eventsAttended =
    activityData.events.upcoming.length + activityData.events.past.length;
  const communitiesActive = activityData.communities.length;
  const monthsExploring = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    )
  );

  return (
    <div className="min-h-dvh bg-cave-black">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* ── Header: logo left, settings gear right (own only) ─────────────── */}
      <header className="sticky top-0 z-40 relative flex items-center justify-between px-4 py-3 bg-cave-black/80 backdrop-blur-md safe-area-top">
        {/* Back arrow (left) */}
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Volver"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Logo (centered) */}
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

        {isOwnProfile ? (
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
            aria-label="Ajustes"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {/* Content — centered, sensible max-width for desktop */}
      <div className="mx-auto w-full max-w-[760px] px-4 sm:px-6 pb-12">
        {/* ── Identity block + organizer CTA (same row, mockup) ───────────── */}
        <section className="flex flex-row items-stretch gap-3 sm:gap-4 pt-5">
          {/* Left: photo + identity */}
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-cave-ash shrink-0">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-cave-stone flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cave-smoke">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>

            <div className="min-w-0 pt-1">
              <h1 className="text-xl sm:text-2xl text-cave-white font-[family-name:var(--font-space-mono)] font-bold tracking-tight truncate">
                {profile.username}
              </h1>

              {/* Role label + edit pencil (own only) */}
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-xs uppercase tracking-[0.12em] text-cave-fog font-[family-name:var(--font-space-mono)]">
                  {roleLabel}
                </span>
                {isOwnProfile && (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="flex items-center justify-center w-6 h-6 text-cave-smoke hover:text-cave-white transition-colors"
                    aria-label="Editar perfil"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
              </div>

              {profile.city && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {profile.city}
                </p>
              )}

              {profile.bio && (
                <p className="mt-2 text-sm text-cave-fog font-[family-name:var(--font-inter)] leading-relaxed max-w-[320px]">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Right: organizer CTA — own profile & not yet organizer.
              Same row as identity (mockup): compact card on phones, ~320px desktop. */}
          {isOwnProfile && !isOrganizer && (
            <div className="w-[150px] shrink-0 sm:w-[320px]">
              <OrganizerCtaCard />
            </div>
          )}
        </section>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="mt-6">
          <ProfileStatsRow
            eventsAttended={eventsAttended}
            communitiesActive={communitiesActive}
            monthsExploring={monthsExploring}
            saved={isOwnProfile ? savedFlyers.length : undefined}
          />
        </div>

        {/* ── No-DMs banner ───────────────────────────────────────────────── */}
        <div className="mt-4">
          <NoDmsBanner />
        </div>

        {/* ── Sections ────────────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-col gap-8">
          <ProfileUpcomingCarousel events={activityData.events.upcoming} />
          <ProfileCommunitiesCarousel communities={activityData.communities} />
          <ProfileRecapsCarousel recaps={recaps} />
        </div>
      </div>

      {/* ── Settings drawer — own profile only ──────────────────────────────── */}
      {isOwnProfile && (
        <ProfileSettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          isAdmin={isAdmin}
          conversations={activityData.conversations}
          recentActivity={activityData.recentActivity}
          activityLoading={activityData.loading}
          onEditProfile={() => setEditOpen(true)}
          onSignOut={handleSignOut}
        />
      )}

      {/* ── Edit profile modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 backdrop-blur-2xl"
              onClick={() => setEditOpen(false)}
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.92) 70%, rgba(0,0,0,0.97) 100%)",
                WebkitBackdropFilter: "blur(40px)",
              }}
            />
            <ProfileEditModal
              onBack={() => setEditOpen(false)}
              onClose={handleEditClose}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-cave-ash/60 px-6 py-5 flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link
            href="/communities"
            className="text-xs tracking-[0.2em] text-cave-smoke uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Comunidades
          </Link>
          <span className="text-cave-ash text-xs">·</span>
          <Link
            href="/terms"
            className="text-xs tracking-[0.2em] text-cave-smoke uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Términos
          </Link>
          <span className="text-cave-ash text-xs">·</span>
          <Link
            href="/organizer"
            className="text-xs tracking-[0.2em] text-cave-smoke uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Organizadores
          </Link>
          <span className="text-cave-ash text-xs">·</span>
          <Link
            href="/content-policy"
            className="text-xs tracking-[0.2em] text-cave-smoke uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Contenido
          </Link>
        </div>
        <p className="text-[10px] text-cave-ash font-[family-name:var(--font-space-mono)]">
          © {new Date().getFullYear()} Caves App. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
