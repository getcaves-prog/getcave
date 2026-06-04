"use client";

import Link from "next/link";
import type { MyCommunity } from "../types/activity.types";

// ─── Role badge ────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Miembro",
};

function RoleBadge({ role }: { role: string }) {
  const isOwner = role === "owner";
  const isAdmin = role === "admin";
  const label = ROLE_LABEL[role] ?? role;

  return (
    <span
      className={`
        inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-[family-name:var(--font-space-mono)] uppercase tracking-wide
        ${isOwner ? "bg-[#39FF14]/15 text-[#39FF14]" : isAdmin ? "bg-cave-fog/15 text-cave-fog" : "bg-cave-ash/40 text-cave-smoke"}
      `}
    >
      {label}
    </span>
  );
}

// ─── Community row ─────────────────────────────────────────────────────────

function CommunityRow({ community }: { community: MyCommunity }) {
  const initials = community.name.slice(0, 2).toUpperCase();

  return (
    <Link
      href={`/communities/${community.slug}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cave-stone/60 border border-cave-ash/40 hover:border-cave-ash/70 active:scale-[0.98] transition-all"
    >
      {/* Avatar */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-cave-ash flex-shrink-0 flex items-center justify-center">
        {community.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={community.avatar_url}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
            {initials}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm text-cave-white font-medium truncate">
            {community.name}
          </span>
          <RoleBadge role={community.role} />
        </div>
        <div className="flex items-center gap-2 text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
          <span>{community.member_count.toLocaleString("es-MX")} miembros</span>
          {community.city && (
            <>
              <span className="text-cave-ash">·</span>
              <span>{community.city}</span>
            </>
          )}
        </div>
      </div>

      {/* Chevron */}
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

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyCommunitiesState() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-cave-stone flex items-center justify-center">
        <svg
          width="24"
          height="24"
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
      <div>
        <p className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)] mb-1">
          Todavía no te uniste a ninguna comunidad
        </p>
        <p className="text-xs text-cave-smoke">
          Explorá las comunidades y sumate a las que te interesen
        </p>
      </div>
      <Link
        href="/communities"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-cave-smoke text-cave-light text-xs font-[family-name:var(--font-space-mono)] hover:bg-white/10 hover:border-cave-light hover:text-cave-white transition-colors"
      >
        Explorar comunidades
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
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}

// ─── Public export ─────────────────────────────────────────────────────────

interface MyCommunitiesListProps {
  communities: MyCommunity[];
  loading?: boolean;
}

export function MyCommunityList({ communities, loading }: MyCommunitiesListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cave-fog border-t-[#39FF14] rounded-full animate-spin" />
      </div>
    );
  }

  if (communities.length === 0) {
    return <EmptyCommunitiesState />;
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-8">
      {communities.map((community) => (
        <CommunityRow key={community.id} community={community} />
      ))}
    </div>
  );
}
