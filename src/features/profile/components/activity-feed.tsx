"use client";

import Link from "next/link";
import type {
  ActivityItem,
  JoinedCommunityActivity,
  RsvpEventActivity,
  PostedMessageActivity,
} from "../types/activity.types";

// ─── Helpers ───────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

// ─── Activity items ────────────────────────────────────────────────────────

function JoinedCommunityItem({ item }: { item: JoinedCommunityActivity }) {
  return (
    <div className="flex items-start gap-3">
      {/* Icon dot */}
      <div className="mt-1 w-7 h-7 rounded-full bg-[#39FF14]/15 flex items-center justify-center flex-shrink-0">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#39FF14"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cave-fog">
          Te uniste a{" "}
          <Link
            href={`/communities/${item.community_slug}`}
            className="text-cave-light hover:text-cave-white transition-colors font-medium"
          >
            {item.community_name}
          </Link>
        </p>
        <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] mt-0.5">
          {relativeTime(item.timestamp)}
        </p>
      </div>
    </div>
  );
}

function RsvpEventItem({ item }: { item: RsvpEventActivity }) {
  return (
    <div className="flex items-start gap-3">
      {/* Icon dot */}
      <div className="mt-1 w-7 h-7 rounded-full bg-cave-fog/15 flex items-center justify-center flex-shrink-0">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cave-fog"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cave-fog">
          Confirmaste asistencia a{" "}
          <Link
            href={`/flyer/${item.flyer_id}`}
            className="text-cave-white hover:text-cave-fog transition-colors font-medium"
          >
            {item.flyer_title ?? "un evento"}
          </Link>
          {item.going_solo && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-[family-name:var(--font-space-mono)] bg-cave-fog/10 text-cave-smoke uppercase tracking-wide">
              solo
            </span>
          )}
        </p>
        <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] mt-0.5">
          {relativeTime(item.timestamp)}
        </p>
      </div>
    </div>
  );
}

function PostedMessageItem({ item }: { item: PostedMessageActivity }) {
  return (
    <div className="flex items-start gap-3">
      {/* Icon dot */}
      <div className="mt-1 w-7 h-7 rounded-full bg-cave-ash/40 flex items-center justify-center flex-shrink-0">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cave-smoke"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cave-fog">
          Publicaste un mensaje
        </p>
        {item.body_preview && (
          <p className="text-xs text-cave-smoke mt-0.5 truncate italic">
            &ldquo;{item.body_preview}&rdquo;
          </p>
        )}
        <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] mt-0.5">
          {relativeTime(item.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ─── Activity item dispatcher ──────────────────────────────────────────────

function ActivityItemRow({ item }: { item: ActivityItem }) {
  switch (item.type) {
    case "joined_community":
      return <JoinedCommunityItem item={item} />;
    case "rsvp_event":
      return <RsvpEventItem item={item} />;
    case "posted_message":
      return <PostedMessageItem item={item} />;
  }
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyActivityState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
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
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <div>
        <p className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)] mb-1">
          Todavía no hay actividad registrada
        </p>
        <p className="text-xs text-cave-smoke">
          Uní comunidades, confirmá eventos y escribí mensajes para ver tu actividad acá
        </p>
      </div>
    </div>
  );
}

// ─── Public export ─────────────────────────────────────────────────────────

interface ActivityFeedProps {
  items: ActivityItem[];
  loading?: boolean;
}

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cave-fog border-t-[#39FF14] rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyActivityState />;
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      {items.map((item, i) => (
        <div key={`${item.type}-${item.timestamp}-${i}`}>
          <ActivityItemRow item={item} />
          {i < items.length - 1 && (
            <div className="mt-4 ml-[44px] h-px bg-cave-ash/30" />
          )}
        </div>
      ))}
    </div>
  );
}
