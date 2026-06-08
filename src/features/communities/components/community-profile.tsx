"use client";

import { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCommunity } from "../hooks/use-community";
import { listMembers } from "../services/community.service";
// Cross-feature import: ChannelManager uses EventThread (conversations/) internally.
// Same documented pattern as flyer-detail-modal.tsx. Minimal surface.
import { ChannelManager } from "./channel-manager";
import { BroadcastChannel } from "./broadcast-channel";
import { CommunityEditModal } from "./community-edit-modal";
import { MembersManager } from "./members-manager";
import { CommunityBannerCollage } from "./community-banner-collage";
import type { OverflowAction } from "./community-banner-collage";
import { CommunityConversationCard } from "./community-conversation-card";
import { CommunityFeaturedEvent } from "./community-featured-event";
import { CommunityUpcomingCarousel } from "./community-upcoming-carousel";
import { CommunityPollCard } from "./community-poll-card";
import { CommunityRecapsCarousel } from "./community-recaps-carousel";
import { useActionModalStore } from "@/shared/stores/action-modal.store";
import { ActionModal } from "@/shared/components/layout/action-modal";
import type { MemberWithProfile, MemberRole } from "../types/community.types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMemberCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Overlapping member avatar stack ─────────────────────────────────────────

function MemberAvatarStack({
  members,
  totalCount,
}: {
  members: MemberWithProfile[];
  totalCount: number;
}) {
  const visible = members.slice(0, 5);
  const overflow = Math.max(0, totalCount - visible.length);

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2.5">
        {visible.map((m, i) => {
          const username = m.profile?.username ?? "?";
          const url = m.profile?.avatar_url ?? null;
          const initials = username.slice(0, 2).toUpperCase();
          return (
            <div
              key={m.id}
              className="relative w-9 h-9 rounded-full ring-2 ring-cave-black overflow-hidden bg-cave-stone flex-shrink-0"
              style={{ zIndex: visible.length - i }}
              title={`@${username}`}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={username} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-[10px] text-cave-fog font-[family-name:var(--font-space-mono)]">
                  {initials}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {overflow > 0 && (
        <span className="ml-2 text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
          +{formatMemberCount(overflow)}
        </span>
      )}
    </div>
  );
}

// ─── CommunityProfile — main component ───────────────────────────────────────

interface CommunityProfileProps {
  slug: string;
}

export function CommunityProfile({ slug }: CommunityProfileProps) {
  const prefersReducedMotion = useReducedMotion();
  const { user } = useAuth();
  const { community, upcomingEvents, pastEvents, loading, error, join, leave, refresh } =
    useCommunity(slug, user?.id);
  const openActionModal = useActionModalStore((s) => s.open);
  const actionModalOpen = useActionModalStore((s) => s.isOpen);
  const closeActionModal = useActionModalStore((s) => s.close);

  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit modal — visible only to owner/admin
  const [editOpen, setEditOpen] = useState(false);
  // Members manager — visible only to owner/admin
  const [membersManagerOpen, setMembersManagerOpen] = useState(false);
  // Channels panel — opened from the conversation card / overflow menu
  const [channelsOpen, setChannelsOpen] = useState(false);
  // Difusión panel — admin announcements + poll creation (overflow menu)
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);

  // Presence user shape — derived from the Supabase auth user.
  const presenceUser = useMemo(() => {
    if (!user) return null;
    const username =
      (user.user_metadata?.username as string | undefined) ??
      (user.email ? user.email.split("@")[0] : "anónimo");
    return { id: user.id, username };
  }, [user]);

  // Open the upload modal with this community preselected
  const handleAddEvent = useCallback(() => {
    if (!community) return;
    openActionModal("upload", community.id);
  }, [community, openActionModal]);

  // Load members once community is available
  const loadMembers = useCallback(
    async (communityId: string) => {
      if (membersLoaded) return;
      try {
        const data = await listMembers(communityId, { limit: 20 });
        setMembers(data);
        setMembersLoaded(true);
      } catch {
        // non-critical — members preview is optional
      }
    },
    [membersLoaded]
  );

  // Trigger member load when community is ready
  if (community && !membersLoaded) {
    loadMembers(community.id);
  }

  const handleJoin = useCallback(async () => {
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }
    setJoining(true);
    setActionError(null);
    try {
      await join();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al unirse");
    } finally {
      setJoining(false);
    }
  }, [user, join]);

  const handleLeave = useCallback(async () => {
    setLeaving(true);
    setActionError(null);
    try {
      await leave();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al salir");
    } finally {
      setLeaving(false);
    }
  }, [leave]);

  const goToLogin = useCallback(() => {
    window.location.href = "/auth/login";
  }, []);

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-dvh bg-cave-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cave-fog border-t-[#FFFFFF] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-cave-black flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-[#FF2D7B] font-[family-name:var(--font-space-mono)] text-sm text-center">
          Error al cargar la comunidad
        </p>
        <Link
          href="/communities"
          className="text-xs text-cave-fog underline font-[family-name:var(--font-space-mono)]"
        >
          Volver a comunidades
        </Link>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-dvh bg-cave-black flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-cave-fog font-[family-name:var(--font-space-mono)] text-sm">
          Comunidad no encontrada
        </p>
        <Link
          href="/communities"
          className="rounded-full border border-cave-ash text-cave-white px-6 py-2.5 text-sm font-[family-name:var(--font-space-mono)]"
        >
          Explorar comunidades
        </Link>
      </div>
    );
  }

  // The community creator ALWAYS retains full control — even if their
  // membership row is missing (e.g. they left and rejoined as a plain member,
  // or it was never created). This stops an owner from locking themselves out
  // of their own community (the "Agregar evento" button, edit, manage members).
  const isCreator = !!user && community.created_by === user.id;
  const isMember = !!community.myMembership || isCreator;
  const isAdmin =
    isCreator ||
    community.myMembership?.role === "owner" ||
    community.myMembership?.role === "admin";

  const featuredEvent = upcomingEvents[0] ?? null;
  const restUpcoming = featuredEvent ? upcomingEvents.slice(1) : upcomingEvents;

  // ─── Overflow menu actions — admin/secondary, relocated from the header ────
  const overflowActions: OverflowAction[] = [];
  // Channels available to everyone (read at minimum) — keeps multi-channel chat reachable.
  overflowActions.push({
    label: "Canales",
    onClick: () => setChannelsOpen(true),
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="10" y1="3" x2="8" y2="21" />
        <line x1="16" y1="3" x2="14" y2="21" />
      </svg>
    ),
  });
  if (isMember) {
    overflowActions.push({
      label: "Agregar evento",
      onClick: handleAddEvent,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
    });
  }
  if (isAdmin) {
    overflowActions.push({
      label: "Editar comunidad",
      onClick: () => setEditOpen(true),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
    });
    overflowActions.push({
      label: "Gestionar miembros",
      onClick: () => setMembersManagerOpen(true),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      ),
    });
    overflowActions.push({
      label: "Difusión",
      onClick: () => setBroadcastOpen(true),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l18-5v12L3 14v-3z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      ),
    });
  }

  return (
    <div className="min-h-dvh bg-[#050505]">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* ── Section 1: Banner collage (full bleed) + back + overflow menu ──── */}
      <CommunityBannerCollage
        pastEvents={pastEvents}
        coverUrl={community.cover_url}
        communityName={community.name}
        actions={overflowActions}
      />

      {/* ── Centered content column (mobile-first, capped on desktop) ──────── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-5">
        {/* ── Section 2: Identity block ───────────────────────────────────── */}
        {/* Horizontal composition: avatar LEFT · name+count+stack column ·
            join/leave button RIGHT (top-aligned with the name). The avatar
            still overlaps the banner bottom edge via -mt. */}
        <div className="-mt-12 mb-5">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Avatar (left) — overlaps banner */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 border-[#050505] bg-cave-stone ring-2 ring-cave-ash/40 flex-shrink-0">
              {community.avatar_url ? (
                <Image
                  src={community.avatar_url}
                  alt={community.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cave-smoke">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
              )}
            </div>

            {/* Name + count + member stack (column, beside the avatar).
                pt aligns the text baseline with the bottom half of the avatar
                that sits below the banner edge. */}
            <div className="flex-1 min-w-0 pt-12 sm:pt-14">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {/* Name */}
                  <h1 className="text-xl sm:text-2xl font-bold text-cave-white font-[family-name:var(--font-space-mono)] tracking-tight leading-tight truncate">
                    {community.name}
                  </h1>

                  {/* Member count */}
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {formatMemberCount(community.member_count ?? 0)} miembros
                  </p>

                  {/* Member avatar stack — under the count.
                      Render whenever at least one member avatar exists. */}
                  {members.length > 0 && (
                    <div className="mt-2.5">
                      <MemberAvatarStack
                        members={members}
                        totalCount={community.member_count ?? members.length}
                      />
                    </div>
                  )}
                </div>

                {/* Join / Leave (right, top-aligned with the name) */}
                <div className="flex-shrink-0">
                  {isMember ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-cave-white/40 bg-cave-white/10">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-[11px] text-cave-white font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-space-mono)]">
                          Unido
                        </span>
                      </div>
                      <motion.button
                        type="button"
                        onClick={handleLeave}
                        disabled={leaving}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="h-9 px-4 rounded-full border border-cave-ash text-cave-smoke text-[11px] font-[family-name:var(--font-space-mono)] uppercase tracking-[0.1em] hover:border-[#FF2D7B]/60 hover:text-[#FF2D7B] transition-colors disabled:opacity-40"
                      >
                        {leaving ? "Saliendo..." : "Salir"}
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={handleJoin}
                      disabled={joining}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="h-10 px-6 sm:px-8 rounded-full bg-cave-white text-cave-black font-bold uppercase tracking-[0.15em] text-xs sm:text-sm font-[family-name:var(--font-space-mono)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joining ? "Uniéndose..." : "Unirse"}
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seeded badge — chip below the identity row, sets honest expectations */}
          {community.is_seeded && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cave-ash/60 bg-cave-stone/60">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cave-fog flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-[10px] text-cave-fog font-[family-name:var(--font-space-mono)] leading-none">
                No oficial · Gestionada por CAVES
              </span>
              {community.source_platform && (
                <>
                  <span className="text-cave-ash/40 text-[10px]">·</span>
                  <span className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)] leading-none capitalize">
                    desde {community.source_platform}
                  </span>
                </>
              )}
            </div>
          )}

          {actionError && (
            <p className="mt-2 text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
              {actionError}
            </p>
          )}

          {/* ── Section 3: Description + location ──────────────────────────── */}
          {(community.description || community.city) && (
            <div className="mt-5">
              {community.description && (
                <p className="text-sm text-cave-fog leading-6 font-[family-name:var(--font-inter)] mb-2">
                  {community.description}
                </p>
              )}
              {community.city && (
                <p className="flex items-center gap-1.5 text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {community.city}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Section blocks ──────────────────────────────────────────────── */}
        <div className="space-y-5 pb-12 safe-area-bottom">
          {/* Section 4: Conversación */}
          <CommunityConversationCard
            communityId={community.id}
            communityName={community.name}
            user={presenceUser}
          />

          {/* Section 5: Próximo evento (featured) — hidden when none */}
          {featuredEvent && (
            <CommunityFeaturedEvent
              event={featuredEvent}
              isAuthenticated={!!user}
              onSignInRequest={goToLogin}
            />
          )}

          {/* Section 6: Próximos eventos carousel — hidden when none */}
          <CommunityUpcomingCarousel events={restUpcoming} />

          {/* Section 7: Encuesta activa — hidden when no active poll */}
          <CommunityPollCard
            communityId={community.id}
            isAuthenticated={!!user}
            onSignInRequest={goToLogin}
          />

          {/* Section 8: Recaps — hidden when none */}
          <CommunityRecapsCarousel communityId={community.id} />
        </div>
      </div>

      {/* ── Channels panel (multi-channel chat) ── overlay sheet ── */}
      {channelsOpen && (
        <div
          className="fixed inset-0 z-[120] bg-cave-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setChannelsOpen(false)}
        >
          <motion.div
            initial={prefersReducedMotion ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="w-full sm:max-w-lg max-h-[85dvh] overflow-y-auto bg-cave-rock border border-cave-ash/60 rounded-t-2xl sm:rounded-2xl p-5 safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-cave-white font-bold uppercase tracking-[0.12em] font-[family-name:var(--font-space-mono)]">
                Canales
              </span>
              <button
                type="button"
                onClick={() => setChannelsOpen(false)}
                className="w-9 h-9 rounded-full border border-cave-ash/50 text-cave-fog hover:text-cave-light flex items-center justify-center"
                aria-label="Cerrar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <ChannelManager
              communityId={community.id}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onSignInRequest={goToLogin}
            />
          </motion.div>
        </div>
      )}

      {/* ── Difusión panel ── announcements + poll creation ── overlay sheet ── */}
      {broadcastOpen && (
        <div
          className="fixed inset-0 z-[120] bg-cave-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setBroadcastOpen(false)}
        >
          <motion.div
            initial={prefersReducedMotion ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="w-full sm:max-w-lg max-h-[85dvh] overflow-y-auto bg-cave-rock border border-cave-ash/60 rounded-t-2xl sm:rounded-2xl p-5 safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-cave-white font-bold uppercase tracking-[0.12em] font-[family-name:var(--font-space-mono)]">
                Difusión
              </span>
              <button
                type="button"
                onClick={() => setBroadcastOpen(false)}
                className="w-9 h-9 rounded-full border border-cave-ash/50 text-cave-fog hover:text-cave-light flex items-center justify-center"
                aria-label="Cerrar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* role gates the composer — only owner/admin can publish. */}
            <BroadcastChannel
              communityId={community.id}
              role={(community.myMembership?.role as MemberRole) ?? "owner"}
            />
          </motion.div>
        </div>
      )}

      {/* ── Edit modal ── owner/admin only ── */}
      {isAdmin && editOpen && community && (
        <CommunityEditModal
          community={community}
          onClose={() => setEditOpen(false)}
          onSuccess={refresh}
        />
      )}

      {/* ── Members manager ── owner/admin only ── */}
      {isAdmin && membersManagerOpen && community && user && (
        <MembersManager
          communityId={community.id}
          currentUserRole={(community.myMembership?.role as MemberRole | undefined) ?? "owner"}
          currentUserId={user.id}
          onClose={() => setMembersManagerOpen(false)}
          onChanged={() => {
            // Reload the members preview and community counts
            setMembersLoaded(false);
            refresh();
          }}
        />
      )}

      {/* Action modal (flyer upload) — mounted here so "Agregar evento" opens
          the full flyer-create flow with this community preselected. */}
      <ActionModal
        isOpen={actionModalOpen}
        onClose={() => {
          closeActionModal();
          refresh();
        }}
      />
    </div>
  );
}
