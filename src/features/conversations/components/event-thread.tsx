"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConversation } from "../hooks/use-conversation";
import { groupByThread } from "../services/conversation.service";
import type { ThreadedMessage, MessageWithAuthor } from "../types/conversation.types";

// ─── Feature boundary note ──────────────────────────────────────────────────
// EventThread is in src/features/conversations/ and is imported by the canvas
// feature (flyer-detail-modal.tsx). This is the smallest possible cross-feature
// surface: a single named import of a presentational component. The alternative
// (lifting thread to a route/shared) would require significant routing changes.
// Decision logged in engram: getcave — "Phase 3 feature boundary decision".
// ────────────────────────────────────────────────────────────────────────────

// ─── Relative time helper ──────────────────────────────────────────────────
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
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// ─── Avatar ────────────────────────────────────────────────────────────────
function Avatar({ url, username }: { url: string | null; username: string }) {
  const initials = username.slice(0, 2).toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={username}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-cave-ash/40"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex-shrink-0 bg-cave-ash flex items-center justify-center ring-1 ring-cave-ash/40">
      <span className="text-[10px] text-cave-fog font-[family-name:var(--font-space-mono)]">
        {initials}
      </span>
    </div>
  );
}

// ─── Single message bubble ─────────────────────────────────────────────────
interface MessageBubbleProps {
  message: MessageWithAuthor;
  currentUserId: string | undefined;
  onReply: (messageId: string, authorName: string) => void;
  onDelete: (messageId: string) => Promise<void>;
  isReply?: boolean;
}

function MessageBubble({ message, currentUserId, onReply, onDelete, isReply }: MessageBubbleProps) {
  const [deleting, setDeleting] = useState(false);
  const isOwn = currentUserId && message.author?.id === currentUserId;
  const authorName = message.author?.username ?? "Usuario";

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(message.id);
    } finally {
      setDeleting(false);
    }
  }, [deleting, onDelete, message.id]);

  return (
    <div className={`flex gap-2 ${isReply ? "" : ""}`}>
      {/* Avatar */}
      <Avatar url={message.author?.avatar_url ?? null} username={authorName} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-cave-white font-[family-name:var(--font-space-mono)] truncate max-w-[140px]">
            @{authorName}
          </span>
          <span className="text-[10px] text-cave-fog font-[family-name:var(--font-space-mono)]">
            {relativeTime(message.created_at)}
          </span>
        </div>

        {/* Body */}
        {message.is_deleted ? (
          <p className="text-xs text-cave-smoke italic mt-1 font-[family-name:var(--font-inter)]">
            mensaje eliminado
          </p>
        ) : (
          <p className="text-sm text-cave-white leading-5 mt-1 font-[family-name:var(--font-inter)] break-words">
            {message.body}
          </p>
        )}

        {/* Actions — only on non-deleted messages */}
        {!message.is_deleted && (
          <div className="flex items-center gap-3 mt-2">
            {/* Reply — only available on top-level messages (not on replies themselves) */}
            {!isReply && currentUserId && (
              <button
                type="button"
                onClick={() => onReply(message.id, authorName)}
                className="text-[10px] text-cave-smoke hover:text-cave-fog transition-colors font-[family-name:var(--font-space-mono)] min-h-[28px] flex items-center"
              >
                responder
              </button>
            )}

            {/* Delete — only own messages */}
            {isOwn && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-[10px] text-[#FF2D7B]/70 hover:text-[#FF2D7B] transition-colors font-[family-name:var(--font-space-mono)] min-h-[28px] flex items-center disabled:opacity-40"
              >
                {deleting ? "eliminando..." : "eliminar"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────
interface ComposerProps {
  replyTo: { id: string; author: string } | null;
  onCancelReply: () => void;
  onSubmit: (body: string, parentId: string | null) => Promise<void>;
}

function Composer({ replyTo, onCancelReply, onSubmit }: ComposerProps) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when replying
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || posting) return;

    setError(null);
    setPosting(true);
    try {
      await onSubmit(trimmed, replyTo?.id ?? null);
      setText("");
      onCancelReply();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Algo salió mal";
      setError(msg);
    } finally {
      setPosting(false);
    }
  }, [text, posting, onSubmit, replyTo, onCancelReply]);

  // Auto-resize textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Reply banner */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#FFFFFF]/10 border border-[#FFFFFF]/20"
          >
            <span className="text-[10px] text-[#FFFFFF] font-[family-name:var(--font-space-mono)]">
              Respondiendo a @{replyTo.author}
            </span>
            <button
              type="button"
              onClick={onCancelReply}
              className="text-[10px] text-cave-smoke hover:text-cave-fog transition-colors font-[family-name:var(--font-space-mono)] min-h-[28px] px-2"
            >
              cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <label className="sr-only">
            {replyTo ? `Responder a @${replyTo.author}` : "Escribí un mensaje"}
          </label>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            placeholder={replyTo ? `Responder a @${replyTo.author}...` : "Escribí un mensaje..."}
            rows={1}
            maxLength={2000}
            className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-cave-rock border border-cave-ash text-cave-white placeholder:text-cave-smoke focus:outline-none focus:border-[#FFFFFF] transition-colors resize-none font-[family-name:var(--font-inter)] text-sm leading-5"
            style={{ height: "44px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />
        </div>

        <motion.button
          type="submit"
          disabled={!text.trim() || posting}
          whileTap={{ scale: 0.93 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-[#FFFFFF] text-cave-black disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          aria-label="Enviar mensaje"
        >
          {posting ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </motion.button>
      </div>

      {error && (
        <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
          {error}
        </p>
      )}
    </form>
  );
}

// ─── EventThread — public API ──────────────────────────────────────────────
// Parameterized to support flyer, community, and channel conversations.
// Pass subjectType='flyer' + subjectId={flyerId} for event threads.
// Pass subjectType='community' + subjectId={communityId} for community chat.
// Pass subjectType='channel' + subjectId={channelId} for channel threads.
// The underlying useConversation hook already accepts subjectType + subjectId.
export interface EventThreadProps {
  subjectType: "flyer" | "community" | "channel";
  subjectId: string;
  currentUserId: string | undefined;
  /** Called when logged-out user taps the sign-in affordance */
  onSignInRequest?: () => void;
  /**
   * When false, hides the composer and shows a read-only notice instead of
   * the message input. Defaults to true. Use to gate admins_only channels.
   */
  canWrite?: boolean;
}

export function EventThread({ subjectType, subjectId, currentUserId, onSignInRequest, canWrite = true }: EventThreadProps) {
  const { messages, loading, error, post, reply, remove } = useConversation(subjectType, subjectId);
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threads: ThreadedMessage[] = groupByThread(messages);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loading]);

  const handleSubmit = useCallback(async (body: string, parentId: string | null) => {
    if (parentId) {
      await reply(body, parentId);
    } else {
      await post(body);
    }
  }, [post, reply]);

  const handleReply = useCallback((messageId: string, authorName: string) => {
    setReplyTo({ id: messageId, author: authorName });
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  // ─── States ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-cave-ash/40 flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-2.5 w-24 rounded bg-cave-ash/40" />
              <div className="h-3 w-full rounded bg-cave-ash/30" />
              <div className="h-3 w-3/4 rounded bg-cave-ash/20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
          Error al cargar la conversación
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Message list */}
      <div className="flex flex-col gap-4">
        {threads.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] leading-5">
              Todavía no hay mensajes —<br />arrancá la conversación
            </p>
          </div>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} className="flex flex-col gap-3">
              {/* Root message */}
              <MessageBubble
                message={thread}
                currentUserId={currentUserId}
                onReply={handleReply}
                onDelete={remove}
              />

              {/* Replies — one level only */}
              {thread.replies.length > 0 && (
                <div className="flex flex-col gap-3 border-l border-cave-rock ml-4 pl-3">
                  {thread.replies.map((r) => (
                    <MessageBubble
                      key={r.id}
                      message={r}
                      currentUserId={currentUserId}
                      onReply={handleReply}
                      onDelete={remove}
                      isReply
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer — logged-in users only, and only when canWrite is true */}
      {currentUserId ? (
        canWrite ? (
          <Composer
            replyTo={replyTo}
            onCancelReply={handleCancelReply}
            onSubmit={handleSubmit}
          />
        ) : (
          /* Read-only notice for admins_only channels when user is not admin */
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-cave-stone/60 border border-cave-ash/40">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cave-fog flex-shrink-0"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
              Solo administradores pueden escribir
            </p>
          </div>
        )
      ) : (
        /* Logged-out sign-in affordance */
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] text-center leading-5">
            Iniciá sesión para participar en la conversación
          </p>
          <button
            type="button"
            onClick={onSignInRequest}
            className="h-[44px] px-6 rounded-full border-2 border-cave-light text-cave-white text-xs font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-space-mono)] hover:bg-white/10 transition-colors"
          >
            Iniciar sesión
          </button>
        </div>
      )}
    </div>
  );
}
