"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCommunity } from "../hooks/use-community";
import { listMembers } from "../services/community.service";
// Cross-feature import: EventThread lives in conversations/; same pattern as
// flyer-detail-modal.tsx. Minimal surface — one named import.
import { EventThread } from "@/features/conversations/components/event-thread";
// Cross-feature import: RecapsGallery lives in recaps/; same minimal-surface
// pattern as EventThread. isOwner not applicable in community context — gallery
// is read-only for non-uploaders; community admins cannot delete others' recaps
// at the community level (delete is per-flyer). See decision note below.
import { BroadcastChannel } from "./broadcast-channel";
import type { MemberWithProfile, Flyer, MemberRole } from "../types/community.types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMemberCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── MemberAvatars — small avatar row ────────────────────────────────────────

function MemberAvatarRow({ members }: { members: MemberWithProfile[] }) {
  const visible = members.slice(0, 6);
  return (
    <div className="flex items-center gap-1.5">
      {visible.map((m, i) => {
        const username = m.profile?.username ?? "?";
        const url = m.profile?.avatar_url ?? null;
        const initials = username.slice(0, 2).toUpperCase();
        return (
          <div
            key={m.id}
            className="relative w-8 h-8 rounded-full ring-2 ring-cave-black overflow-hidden bg-cave-stone flex-shrink-0"
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
  );
}

// ─── EventCard — compact event row (local to communities feature) ─────────────
// Not importing canvas internals. Small presentational card linking to /flyer/[id].

function EventCard({ event }: { event: Flyer }) {
  const dateLabel = event.event_date
    ? new Date(event.event_date + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <Link
      href={`/flyer/${event.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cave-stone/60 border border-cave-ash/40 hover:border-cave-ash/70 transition-colors active:scale-[0.98]"
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-[68px] rounded-lg overflow-hidden bg-cave-ash flex-shrink-0">
        {event.image_url && (
          <Image
            src={event.image_url}
            alt={event.title ?? "Evento"}
            fill
            sizes="48px"
            className="object-cover"
            unoptimized
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {event.title && (
          <p className="text-sm text-cave-white font-medium truncate font-[family-name:var(--font-inter)] leading-5">
            {event.title}
          </p>
        )}
        {dateLabel && (
          <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] mt-0.5">
            {dateLabel}
          </p>
        )}
        {event.address && (
          <p className="text-[11px] text-cave-fog mt-0.5 truncate font-[family-name:var(--font-inter)]">
            {event.address}
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
    </Link>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] uppercase tracking-[0.2em] text-cave-smoke font-[family-name:var(--font-space-mono)] mb-3">
      {children}
    </h2>
  );
}

// ─── CommunityProfile — main component ───────────────────────────────────────

interface CommunityProfileProps {
  slug: string;
}

export function CommunityProfile({ slug }: CommunityProfileProps) {
  const { user } = useAuth();
  const { community, upcomingEvents, pastEvents, loading, error, join, leave } = useCommunity(
    slug,
    user?.id
  );

  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);

  // Event tab state
  const [eventTab, setEventTab] = useState<"upcoming" | "past">("upcoming");

  // Conversation accordion
  const [showThread, setShowThread] = useState(false);

  // Load members once community is available
  const loadMembers = useCallback(async (communityId: string) => {
    if (membersLoaded) return;
    try {
      const data = await listMembers(communityId, { limit: 20 });
      setMembers(data);
      setMembersLoaded(true);
    } catch {
      // non-critical — members preview is optional
    }
  }, [membersLoaded]);

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

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-dvh bg-cave-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cave-fog border-t-[#39FF14] rounded-full animate-spin" />
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

  const isMember = !!community.myMembership;
  const displayEvents = eventTab === "upcoming" ? upcomingEvents : pastEvents;

  return (
    <div className="min-h-dvh bg-[#050505]">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#050505]/80 backdrop-blur-md safe-area-top border-b border-cave-ash/20">
        <Link
          href="/communities"
          className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Volver a comunidades"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <span className="font-[family-name:var(--font-space-mono)] text-sm text-cave-white truncate max-w-[200px]">
          {community.name}
        </span>
        <div className="w-10" />
      </header>

      {/* ── Cover banner ──────────────────────────────────────────────── */}
      <div className="relative w-full h-40 bg-cave-stone overflow-hidden">
        {community.cover_url ? (
          <Image
            src={community.cover_url}
            alt={`Portada de ${community.name}`}
            fill
            className="object-cover"
            unoptimized
            priority
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #0A0A0A 0%, #111 50%, #0A0A0A 100%)",
            }}
          />
        )}
        {/* Gradient overlay so avatar reads on top */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505]/90" />
      </div>

      {/* ── Avatar + identity ─────────────────────────────────────────── */}
      <div className="relative px-5 pb-5 -mt-10">
        {/* Avatar */}
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-3 border-[#050505] bg-cave-stone mb-3 ring-2 ring-cave-ash/40">
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
              <svg
                width="32"
                height="32"
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

        {/* Name */}
        <h1 className="text-2xl font-bold text-cave-white font-[family-name:var(--font-space-mono)] tracking-tight leading-tight">
          {community.name}
        </h1>

        {/* Meta row: city + member count */}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {community.city && (
            <span className="flex items-center gap-1 text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {community.city}
            </span>
          )}
          <span className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
            {formatMemberCount(community.member_count ?? 0)} miembros
          </span>
        </div>

        {/* Description */}
        {community.description && (
          <p className="mt-3 text-sm text-cave-fog leading-6 font-[family-name:var(--font-inter)]">
            {community.description}
          </p>
        )}

        {/* ── Join / Leave ────────────────────────────────────────────── */}
        <div className="mt-4">
          {isMember ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#39FF14]/50 bg-[#39FF14]/10">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-xs text-[#39FF14] font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-space-mono)]">
                  Unido
                </span>
              </div>
              <motion.button
                type="button"
                onClick={handleLeave}
                disabled={leaving}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="h-[40px] px-4 rounded-full border border-cave-ash text-cave-smoke text-xs font-[family-name:var(--font-space-mono)] uppercase tracking-[0.1em] hover:border-cave-fog hover:text-cave-white transition-colors disabled:opacity-40"
              >
                {leaving ? "Saliendo..." : "Salir"}
              </motion.button>
            </div>
          ) : (
            <motion.button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="h-[48px] px-8 rounded-full bg-[#39FF14] text-cave-black font-bold uppercase tracking-[0.15em] text-sm font-[family-name:var(--font-space-mono)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? "Uniéndose..." : "Unirse"}
            </motion.button>
          )}

          {actionError && (
            <p className="mt-2 text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
              {actionError}
            </p>
          )}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="h-px bg-cave-ash/20 mx-5" />

      {/* ── Members preview ──────────────────────────────────────────── */}
      <div className="px-5 py-5">
        <SectionHeading>Miembros</SectionHeading>
        {members.length > 0 ? (
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <MemberAvatarRow members={members} />
            </div>
            {(community.member_count ?? 0) > 6 && (
              <span className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
                +{formatMemberCount((community.member_count ?? 0) - 6)} más
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
            Sé el primero en unirte
          </p>
        )}
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="h-px bg-cave-ash/20 mx-5" />

      {/* ── Eventos ──────────────────────────────────────────────────── */}
      <div className="px-5 py-5">
        <SectionHeading>Eventos</SectionHeading>

        {/* Tab switcher */}
        <div className="flex gap-0 mb-4 rounded-xl overflow-hidden border border-cave-ash/40 w-fit">
          {(["upcoming", "past"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setEventTab(tab)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-space-mono)] transition-colors min-h-[40px] ${
                eventTab === tab
                  ? "bg-[#39FF14] text-cave-black"
                  : "text-cave-smoke hover:text-cave-white"
              }`}
            >
              {tab === "upcoming" ? "Próximos" : "Pasados"}
            </button>
          ))}
        </div>

        {/* Event list */}
        <div className="flex flex-col gap-2">
          {displayEvents.length === 0 ? (
            <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] py-4 text-center">
              {eventTab === "upcoming"
                ? "No hay eventos próximos"
                : "No hay eventos pasados"}
            </p>
          ) : (
            displayEvents.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="h-px bg-cave-ash/20 mx-5" />

      {/* ── Conversación ─────────────────────────────────────────────── */}
      <div className="px-5 py-5">
        <button
          type="button"
          onClick={() => setShowThread((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-cave-stone/60 border border-cave-ash/40 hover:border-cave-ash/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cave-fog"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[10px] uppercase tracking-[0.2em] text-cave-fog font-[family-name:var(--font-space-mono)]">
              Conversación
            </span>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-cave-smoke transition-transform duration-200 ${showThread ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <AnimatePresence>
          {showThread && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                {/* Cross-feature import: EventThread (conversations/) reused here
                    with subjectType='community'. Same documented pattern as
                    flyer-detail-modal.tsx. See engram: getcave / phase3 feature boundary. */}
                <EventThread
                  subjectType="community"
                  subjectId={community.id}
                  currentUserId={user?.id}
                  onSignInRequest={() => {
                    window.location.href = "/auth/login";
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Difusión ──────────────────────────────────────────────────── */}
      <div className="h-px bg-cave-ash/20 mx-5" />
      <div className="px-5 py-5">
        <SectionHeading>Difusión</SectionHeading>
        {/* Admin-gating is handled inside BroadcastChannel via the role prop.
            role is derived from community.myMembership — null for anonymous/
            non-members, 'member' for regular members, 'owner'/'admin' for admins.
            Only owner/admin see the composer; everyone sees the read-only list. */}
        <BroadcastChannel
          communityId={community.id}
          role={(community.myMembership?.role as MemberRole) ?? null}
        />
      </div>

      {/* ── Recaps ────────────────────────────────────────────────────── */}
      {/* DECISION: The community-level Recaps stub is NOT wired to RecapsGallery.
          RecapsGallery requires a flyerId (per-event media), not a communityId.
          Showing recaps from "the most recent past event" would require picking
          a single flyerId heuristically, which is fragile and confusing (which
          event? what if there are none?). The clean pattern is: recaps live on
          each event detail (FlyerDetailModal). This stub shows a short note
          directing users to individual events. If a community-level recap feed
          is needed in the future, a dedicated service/hook that aggregates
          event_media by community_id should be built. */}
      <div className="h-px bg-cave-ash/20 mx-5" />
      <div className="px-5 py-5">
        <SectionHeading>Recaps</SectionHeading>
        <div className="py-5 flex flex-col items-center gap-3 rounded-2xl border border-cave-ash/20 bg-cave-stone/20">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-cave-ash"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="text-xs text-cave-ash font-[family-name:var(--font-space-mono)] text-center px-4">
            Los recaps de cada evento están en su detalle
          </p>
          {pastEvents.length > 0 && (
            <p className="text-[10px] text-cave-ash/60 font-[family-name:var(--font-space-mono)] text-center px-4">
              Abrí un evento pasado para ver y subir fotos
            </p>
          )}
        </div>
      </div>

      {/* Footer spacer for safe area */}
      <div className="h-8 safe-area-bottom" />
    </div>
  );
}
