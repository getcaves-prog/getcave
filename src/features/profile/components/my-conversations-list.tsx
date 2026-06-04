"use client";

import Link from "next/link";
import type { MyConversation } from "../types/activity.types";

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

function resolveHref(conv: MyConversation): string {
  if (conv.subject_type === "flyer") {
    return `/flyer/${conv.subject_id}`;
  }
  if (conv.subject_type === "community") {
    // Route is /communities/[slug] — use community_slug, fallback to "#" if missing
    return conv.community_slug ? `/communities/${conv.community_slug}` : "#";
  }
  return "#";
}

// ─── Subject type chip ─────────────────────────────────────────────────────

const SUBJECT_CHIP: Record<string, { label: string; color: string }> = {
  flyer: { label: "Evento", color: "bg-[#FFFFFF]/10 text-[#FFFFFF]" },
  community: { label: "Comunidad", color: "bg-cave-fog/10 text-cave-fog" },
};

function SubjectChip({ subjectType }: { subjectType: string }) {
  const chip = SUBJECT_CHIP[subjectType] ?? { label: subjectType, color: "bg-cave-ash/40 text-cave-smoke" };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-[family-name:var(--font-space-mono)] uppercase tracking-wide ${chip.color}`}
    >
      {chip.label}
    </span>
  );
}

// ─── Conversation row ──────────────────────────────────────────────────────

function ConversationRow({ conv }: { conv: MyConversation }) {
  const href = resolveHref(conv);

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cave-stone/60 border border-cave-ash/40 hover:border-cave-ash/70 active:scale-[0.98] transition-all"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-full bg-cave-ash flex items-center justify-center flex-shrink-0">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cave-smoke"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <SubjectChip subjectType={conv.subject_type} />
          <span className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)]">
            {relativeTime(conv.last_activity_at)}
          </span>
        </div>
        <p className="text-sm text-cave-white truncate">
          {conv.subject_label ?? "Conversación"}
        </p>
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

function EmptyConversationsState() {
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
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div>
        <p className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)] mb-1">
          Todavía no participaste en ninguna conversación
        </p>
        <p className="text-xs text-cave-smoke">
          Comentá en eventos o comunidades y tus conversaciones aparecerán acá
        </p>
      </div>
    </div>
  );
}

// ─── Public export ─────────────────────────────────────────────────────────

interface MyConversationsListProps {
  conversations: MyConversation[];
  loading?: boolean;
}

export function MyConversationsList({ conversations, loading }: MyConversationsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cave-fog border-t-[#FFFFFF] rounded-full animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return <EmptyConversationsState />;
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-8">
      {conversations.map((conv) => (
        <ConversationRow key={conv.conversation_id} conv={conv} />
      ))}
    </div>
  );
}
