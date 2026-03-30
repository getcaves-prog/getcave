"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { createClient } from "@/shared/lib/supabase/client";
import {
  getProfileByUsername,
  getUserFlyers,
  getUserStats,
} from "@/features/profile/services/profile.service";
import { ProfileEditModal } from "@/features/profile/components/profile-edit-modal";
import { MyFlyerCard } from "@/features/profile/components/my-flyer-card";
import { getMyFlyers } from "@/features/profile/services/my-flyers.service";
import { getSavedFlyers } from "@/features/canvas/services/favorites.service";
import type { Tables } from "@/shared/types/database.types";

type Profile = Pick<
  Tables<"profiles">,
  "id" | "username" | "avatar_url" | "bio" | "city" | "role" | "created_at"
>;

type Flyer = Tables<"flyers">;

interface UserStats {
  flyers_posted: number;
  total_views: number;
  total_saves: number;
}

type Tab = "flyers" | "my-flyers" | "saved";

interface ProfilePageProps {
  username: string;
}

export function ProfilePage({ username }: ProfilePageProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [publicFlyers, setPublicFlyers] = useState<Flyer[]>([]);
  const [myFlyers, setMyFlyers] = useState<Flyer[]>([]);
  const [savedFlyers, setSavedFlyers] = useState<Flyer[]>([]);
  const [stats, setStats] = useState<UserStats>({
    flyers_posted: 0,
    total_views: 0,
    total_saves: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("flyers");
  const [editOpen, setEditOpen] = useState(false);
  const [selectedFlyer, setSelectedFlyer] = useState<Flyer | null>(null);

  const isOwnProfile = user?.id === profile?.id;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const profileData = await getProfileByUsername(username);
    if (!profileData) {
      setLoading(false);
      return;
    }
    setProfile(profileData);

    const [flyersData, statsData] = await Promise.all([
      getUserFlyers(profileData.id),
      getUserStats(profileData.id),
    ]);

    setPublicFlyers(flyersData);
    setStats(statsData);
    setLoading(false);
  }, [username]);

  const loadMyFlyers = useCallback(async () => {
    if (!isOwnProfile) return;
    const data = await getMyFlyers();
    setMyFlyers(data);
  }, [isOwnProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isOwnProfile && activeTab === "my-flyers") {
      loadMyFlyers();
    }
    if (isOwnProfile && activeTab === "saved") {
      getSavedFlyers().then(setSavedFlyers);
    }
  }, [isOwnProfile, activeTab, loadMyFlyers]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }, []);

  const handleEditClose = useCallback(() => {
    setEditOpen(false);
    loadProfile();
  }, [loadProfile]);

  const handleMyFlyerChange = useCallback(() => {
    loadMyFlyers();
    loadProfile();
  }, [loadMyFlyers, loadProfile]);

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
          User not found
        </p>
        <Link
          href="/"
          className="rounded-full bg-cave-white text-cave-black px-6 py-2.5 text-sm font-medium"
        >
          Back to Canvas
        </Link>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    "en-US",
    { month: "short", year: "numeric" }
  );

  const displayFlyers = activeTab === "saved" ? savedFlyers : activeTab === "my-flyers" ? myFlyers : publicFlyers;

  return (
    <div className="min-h-dvh bg-cave-black">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Header bar — full width */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-cave-black/80 backdrop-blur-md safe-area-top">
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Back to canvas"
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

        <span className="font-[family-name:var(--font-space-mono)] text-sm text-cave-white">
          Profile
        </span>

        {isOwnProfile ? (
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
            aria-label="Edit profile"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {/* Content — centered, narrower */}
      <div className="mx-auto w-[85%] max-w-[800px]">

      {/* Profile info */}
      <div className="flex flex-col items-center px-6 pt-4 pb-6">
        {/* Avatar */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-cave-ash mb-4">
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
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-cave-smoke"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>

        {/* Username with decorative element */}
        <div className="flex flex-col items-center mb-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-px bg-gradient-to-r from-transparent via-cave-ash to-transparent" />
            <span className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] uppercase tracking-widest">member</span>
            <div className="w-8 h-px bg-gradient-to-r from-transparent via-cave-ash to-transparent" />
          </div>
          <h1 className="text-2xl text-cave-white font-[family-name:var(--font-space-mono)] font-bold tracking-tight">
            @{profile.username}
          </h1>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-cave-fog text-center max-w-[280px] mb-2">
            {profile.bio}
          </p>
        )}

        {/* City + Member since */}
        <div className="flex items-center gap-3 text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
          {profile.city && (
            <>
              <span className="flex items-center gap-1">
                <svg
                  width="10"
                  height="10"
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
                {profile.city}
              </span>
              <span className="text-cave-ash">|</span>
            </>
          )}
          <span>Since {memberSince}</span>
        </div>
      </div>

      {/* Sign out — own profile only */}
      {isOwnProfile && (
        <div className="flex justify-center mb-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-cave-smoke hover:text-cave-fog transition-colors font-[family-name:var(--font-space-mono)]"
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 border-y border-cave-ash py-4 mx-4 mb-4">
        <div className="flex flex-col items-center">
          <span className="text-lg text-cave-white font-[family-name:var(--font-space-mono)] font-bold">
            {stats.flyers_posted}
          </span>
          <span className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
            Flyers
          </span>
        </div>
        <div className="flex flex-col items-center border-x border-cave-ash">
          <span className="text-lg text-cave-white font-[family-name:var(--font-space-mono)] font-bold">
            {stats.total_views}
          </span>
          <span className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
            Views
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg text-cave-white font-[family-name:var(--font-space-mono)] font-bold">
            {stats.total_saves}
          </span>
          <span className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
            Saves
          </span>
        </div>
      </div>

      {/* Tabs — only show if own profile */}
      {isOwnProfile && (
        <div className="flex gap-2 px-4 mb-4">
          <button
            onClick={() => setActiveTab("flyers")}
            className={`min-h-[44px] flex-1 rounded-full px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs transition-colors ${
              activeTab === "flyers"
                ? "bg-cave-white text-cave-black"
                : "border border-cave-ash text-cave-fog hover:text-cave-white"
            }`}
          >
            Shared
          </button>
          <button
            onClick={() => setActiveTab("my-flyers")}
            className={`min-h-[44px] flex-1 rounded-full px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs transition-colors ${
              activeTab === "my-flyers"
                ? "bg-cave-white text-cave-black"
                : "border border-cave-ash text-cave-fog hover:text-cave-white"
            }`}
          >
            My Flyers
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`min-h-[44px] flex-1 rounded-full px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs transition-colors ${
              activeTab === "saved"
                ? "bg-cave-white text-cave-black"
                : "border border-cave-ash text-cave-fog hover:text-cave-white"
            }`}
          >
            Saved
          </button>
        </div>
      )}

      {/* Flyer grid / list */}
      {activeTab === "my-flyers" ? (
        <div className="flex flex-col gap-3 px-4 pb-8">
          {myFlyers.length === 0 ? (
            <div className="py-12 text-center text-cave-fog text-sm font-[family-name:var(--font-space-mono)]">
              No flyers yet
            </div>
          ) : (
            myFlyers.map((flyer) => (
              <MyFlyerCard
                key={flyer.id}
                flyer={flyer}
                onChange={handleMyFlyerChange}
              />
            ))
          )}
        </div>
      ) : activeTab === "saved" ? (
        <div className="grid grid-cols-3 gap-1 px-1 pb-8">
          {savedFlyers.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-cave-fog text-sm font-[family-name:var(--font-space-mono)]">
              No saved flyers yet
            </div>
          ) : (
            savedFlyers.map((flyer) => (
              <div key={flyer.id} className="relative aspect-[7/10] overflow-hidden bg-cave-stone group">
                <button
                  onClick={() => setSelectedFlyer(flyer)}
                  className="absolute inset-0 z-0"
                >
                  <Image
                    src={flyer.image_url}
                    alt={flyer.title ?? "Flyer"}
                    fill
                    sizes="33vw"
                    className="object-cover"
                    unoptimized
                  />
                </button>
                {/* Unsave button */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const { toggleSaveFlyer } = await import("@/features/canvas/services/favorites.service");
                    await toggleSaveFlyer(flyer.id);
                    setSavedFlyers((prev) => prev.filter((f) => f.id !== flyer.id));
                  }}
                  className="absolute top-1.5 right-1.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-cave-black/70 text-cave-white md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  aria-label="Remove from saved"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      ) : activeTab === "flyers" ? (
        <div className="grid grid-cols-3 gap-1 px-1 pb-8">
          {publicFlyers.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-cave-fog text-sm font-[family-name:var(--font-space-mono)]">
              No flyers yet
            </div>
          ) : (
            publicFlyers.map((flyer) => (
              <button
                key={flyer.id}
                onClick={() => setSelectedFlyer(flyer)}
                className="relative aspect-[7/10] overflow-hidden bg-cave-stone"
              >
                <Image
                  src={flyer.image_url}
                  alt={flyer.title ?? "Flyer"}
                  fill
                  sizes="33vw"
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))
          )}
        </div>
      ) : null}

      {/* Flyer detail modal */}
      <AnimatePresence>
        {selectedFlyer && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 backdrop-blur-2xl"
              onClick={() => setSelectedFlyer(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.92) 70%, rgba(0,0,0,0.97) 100%)",
                WebkitBackdropFilter: "blur(40px)",
              }}
            />

            <motion.div
              className="relative z-10 flex flex-col items-center max-w-[420px] w-full"
              initial={{ scale: 0.15, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.15, opacity: 0, y: 40 }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 26,
                mass: 0.9,
              }}
            >
              <button
                onClick={() => setSelectedFlyer(null)}
                className="absolute -top-3 -right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-cave-black/90 border border-cave-ash/40 text-cave-fog hover:text-cave-white transition-colors"
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <div
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: "7 / 10" }}
              >
                <Image
                  src={selectedFlyer.image_url}
                  alt={selectedFlyer.title ?? "Flyer"}
                  fill
                  sizes="420px"
                  className="object-cover"
                  loading="eager"
                  unoptimized
                />
              </div>

              {/* Flyer info below image */}
              <div className="w-full mt-4 px-2">
                {selectedFlyer.title && (
                  <p className="text-sm text-cave-white font-medium mb-1">
                    {selectedFlyer.title}
                  </p>
                )}
                {selectedFlyer.address && (
                  <p className="text-xs text-cave-fog flex items-center gap-1">
                    <svg
                      width="10"
                      height="10"
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
                    {selectedFlyer.address}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>

      {/* Edit profile modal */}
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
    </div>
  );
}
