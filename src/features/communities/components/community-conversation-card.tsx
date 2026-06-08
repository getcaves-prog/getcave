"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  getOrCreateConversation,
  listMessages,
} from "@/features/conversations/services/conversation.service";
import { useOpenChatsStore } from "@/features/conversations/stores/open-chats.store";
import { useCommunityPresence } from "../hooks/use-community-presence";
import type { MessageWithAuthor } from "@/features/conversations/types/conversation.types";

// ─── Relative time helper (Spanish, compact) ────────────────────────────────
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

interface CommunityConversationCardProps {
  communityId: string;
  communityName: string;
  /** Current user for presence tracking + chat-head write permission. */
  user: { id: string; username: string } | null;
  /** Opens the multi-channel manager (e.g. from the "..." menu fallback). */
  onOpenChannels?: () => void;
}

// ─── CONVERSACIÓN card ───────────────────────────────────────────────────────
// Shows live presence ("X personas hablando ahora"), a short preview of the
// last messages, and an "Entrar al chat" button that opens the community
// conversation as a floating chat head (open-chats store).
export function CommunityConversationCard({
  communityId,
  communityName,
  user,
  onOpenChannels,
}: CommunityConversationCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const openChat = useOpenChatsStore((s) => s.openChat);
  const { count } = useCommunityPresence(communityId, user);

  const [messages, setMessages] = useState<MessageWithAuthor[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const conversation = await getOrCreateConversation("community", communityId);
        const all = await listMessages(conversation.id);
        if (cancelled) return;
        // Last 4 non-deleted messages, oldest→newest for natural reading order.
        const recent = all.filter((m) => !m.is_deleted).slice(-4);
        setMessages(recent);
      } catch {
        // Preview is non-critical — fail silently and show the empty state.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  const handleEnter = () => {
    openChat({
      subjectType: "community",
      subjectId: communityId,
      label: communityName,
      canWrite: true,
    });
  };

  const headerLabel =
    count > 0
      ? `${count} ${count === 1 ? "persona hablando" : "personas hablando"} ahora`
      : "Conversación";

  return (
    <section className="bg-cave-rock border border-cave-ash/50 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            count > 0 ? "bg-cave-white" : "bg-cave-smoke"
          }`}
          aria-hidden="true"
        />
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-cave-light font-[family-name:var(--font-space-mono)]">
          {headerLabel}
        </h2>
      </div>

      {/* Message preview */}
      {loaded && messages.length > 0 ? (
        <ul className="flex flex-col gap-3 mb-4">
          {messages.map((m) => {
            const username = m.author?.username ?? "anónimo";
            const avatar = m.author?.avatar_url ?? null;
            const body = m.body ?? (m.media_url ? "📎 Adjunto" : "");
            return (
              <li key={m.id} className="flex items-start gap-2.5">
                <div className="relative w-7 h-7 rounded-full overflow-hidden bg-cave-stone flex-shrink-0 ring-1 ring-cave-ash/40">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-[9px] text-cave-fog font-[family-name:var(--font-space-mono)]">
                      {username.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-cave-light font-medium font-[family-name:var(--font-inter)] truncate">
                      {username}
                    </span>
                    <span className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)] flex-shrink-0">
                      {relativeTime(m.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-cave-fog font-[family-name:var(--font-inter)] truncate leading-5">
                    {body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] mb-4">
          {loaded ? "Todavía no hay mensajes. Rompé el hielo." : "Cargando conversación..."}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <motion.button
          type="button"
          onClick={handleEnter}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex-1 h-[44px] rounded-full bg-cave-white text-cave-black font-bold uppercase tracking-[0.12em] text-xs font-[family-name:var(--font-space-mono)] flex items-center justify-center gap-2"
        >
          Entrar al chat
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </motion.button>
        {onOpenChannels && (
          <button
            type="button"
            onClick={onOpenChannels}
            className="h-[44px] w-[44px] rounded-full border border-cave-ash/60 text-cave-fog hover:text-cave-light hover:border-cave-fog/60 transition-colors flex items-center justify-center flex-shrink-0"
            aria-label="Ver canales"
            title="Canales"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
              <line x1="10" y1="3" x2="8" y2="21" />
              <line x1="16" y1="3" x2="14" y2="21" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
