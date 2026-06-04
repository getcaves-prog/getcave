"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useBroadcasts } from "../hooks/use-broadcasts";
import { getPollResults } from "../services/broadcast.service";
import type {
  Broadcast,
  BroadcastKind,
  MemberRole,
  PollResults,
} from "../types/community.types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BroadcastChannelProps {
  communityId: string;
  role: MemberRole | null; // null = not a member / not authenticated
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays}d`;
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

function isAdmin(role: MemberRole | null): boolean {
  return role === "owner" || role === "admin";
}

// ─── Kind chip ────────────────────────────────────────────────────────────────

const KIND_META: Record<
  BroadcastKind,
  { label: string; color: string; icon: React.ReactNode }
> = {
  announcement: {
    label: "Anuncio",
    color: "text-[#39FF14] border-[#39FF14]/40 bg-[#39FF14]/10",
    icon: (
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
        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" />
        <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
      </svg>
    ),
  },
  schedule_change: {
    label: "Horario",
    color: "text-[#FF6B2B] border-[#FF6B2B]/40 bg-[#FF6B2B]/10",
    icon: (
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
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  location_change: {
    label: "Lugar",
    color: "text-[#FF6B2B] border-[#FF6B2B]/40 bg-[#FF6B2B]/10",
    icon: (
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
    ),
  },
  poll: {
    label: "Encuesta",
    color: "text-cave-fog border-cave-ash/40 bg-cave-ash/10",
    icon: (
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
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
};

function KindChip({ kind }: { kind: string }) {
  const meta = KIND_META[kind as BroadcastKind] ?? KIND_META.announcement;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.15em] font-[family-name:var(--font-space-mono)] border ${meta.color}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ─── PollCard ─────────────────────────────────────────────────────────────────
// Self-contained poll card: loads results, handles vote interaction.

interface PollCardProps {
  broadcast: Broadcast;
  onVote: (broadcastId: string, optionId: string) => Promise<void>;
  userId: string | undefined;
}

function PollCard({ broadcast, onVote, userId }: PollCardProps) {
  const [results, setResults] = useState<PollResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [voting, setVoting] = useState(false);

  const loadResults = useCallback(async () => {
    try {
      const r = await getPollResults(broadcast.id);
      setResults(r);
    } catch {
      // non-critical — show empty state
    } finally {
      setLoadingResults(false);
    }
  }, [broadcast.id]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleVote = useCallback(
    async (optionId: string) => {
      if (!userId || voting || results?.myVotedOptionId) return;
      setVoting(true);
      try {
        await onVote(broadcast.id, optionId);
        await loadResults();
      } finally {
        setVoting(false);
      }
    },
    [userId, voting, results?.myVotedOptionId, onVote, broadcast.id, loadResults]
  );

  const totalVotes =
    results?.options.reduce((sum, o) => sum + o.voteCount, 0) ?? 0;

  const hasVoted = !!results?.myVotedOptionId;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {loadingResults ? (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-cave-ash border-t-[#39FF14] rounded-full animate-spin" />
        </div>
      ) : results && results.options.length > 0 ? (
        <>
          {results.options.map((opt) => {
            const pct =
              totalVotes > 0
                ? Math.round((opt.voteCount / totalVotes) * 100)
                : 0;
            const isMyVote = opt.myVote;

            return (
              <button
                key={opt.optionId}
                type="button"
                onClick={() => handleVote(opt.optionId)}
                disabled={!userId || hasVoted || voting}
                className={`relative w-full text-left rounded-xl px-4 py-3 overflow-hidden border transition-colors min-h-[44px] ${
                  isMyVote
                    ? "border-[#39FF14]/60 bg-[#39FF14]/8 shadow-[0_0_12px_rgba(57,255,20,0.15)]"
                    : hasVoted
                    ? "border-cave-ash/30 bg-cave-ash/5 cursor-default"
                    : "border-cave-ash/40 bg-cave-stone/40 hover:border-cave-ash/70 active:scale-[0.98]"
                } ${!userId ? "cursor-default" : ""}`}
              >
                {/* Progress bar */}
                {hasVoted && (
                  <div
                    className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-700 ${
                      isMyVote ? "bg-[#39FF14]/15" : "bg-cave-ash/10"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-[family-name:var(--font-inter)] leading-5 ${
                      isMyVote ? "text-[#39FF14]" : "text-cave-white"
                    }`}
                  >
                    {opt.label}
                    {isMyVote && (
                      <span className="ml-2 text-[9px] text-[#39FF14] font-[family-name:var(--font-space-mono)] uppercase tracking-[0.1em]">
                        tu voto
                      </span>
                    )}
                  </span>
                  {hasVoted && (
                    <span className="text-xs font-[family-name:var(--font-space-mono)] text-cave-smoke flex-shrink-0">
                      {pct}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          <p className="text-[10px] text-cave-ash font-[family-name:var(--font-space-mono)] text-right mt-1">
            {totalVotes} {totalVotes === 1 ? "voto" : "votos"}
          </p>
        </>
      ) : (
        <p className="text-xs text-cave-ash font-[family-name:var(--font-space-mono)] text-center py-2">
          Sin opciones disponibles
        </p>
      )}

      {!userId && (
        <p className="text-[10px] text-cave-ash font-[family-name:var(--font-space-mono)] text-center">
          Iniciá sesión para votar
        </p>
      )}
    </div>
  );
}

// ─── BroadcastItem ────────────────────────────────────────────────────────────

interface BroadcastItemProps {
  broadcast: Broadcast;
  onVote: (broadcastId: string, optionId: string) => Promise<void>;
  userId: string | undefined;
}

function BroadcastItem({ broadcast, onVote, userId }: BroadcastItemProps) {
  const isPoll = broadcast.kind === "poll";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="rounded-2xl bg-cave-stone/60 border border-cave-ash/30 p-5"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <KindChip kind={broadcast.kind} />
          {broadcast.title && (
            <span className="text-xs font-semibold text-cave-white font-[family-name:var(--font-space-mono)] truncate max-w-[180px]">
              {broadcast.title}
            </span>
          )}
        </div>
        <span className="text-[10px] text-cave-ash font-[family-name:var(--font-space-mono)] flex-shrink-0 mt-0.5">
          {formatRelativeTime(broadcast.created_at)}
        </span>
      </div>

      {/* Body */}
      <p className="text-sm text-cave-fog leading-6 font-[family-name:var(--font-inter)]">
        {broadcast.body}
      </p>

      {/* Poll options */}
      {isPoll && (
        <PollCard broadcast={broadcast} onVote={onVote} userId={userId} />
      )}
    </motion.div>
  );
}

// ─── Composer — announcement form ─────────────────────────────────────────────

type ComposerMode = "idle" | "announcement" | "poll";

interface AnnouncementFormProps {
  onPost: (kind: BroadcastKind, title: string, body: string) => Promise<void>;
  onCancel: () => void;
}

function AnnouncementForm({ onPost, onCancel }: AnnouncementFormProps) {
  const [kind, setKind] = useState<BroadcastKind>("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!body.trim()) {
      setError("El mensaje no puede estar vacío.");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      await onPost(kind, title.trim(), body.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al publicar.");
    } finally {
      setPosting(false);
    }
  }, [kind, title, body, onPost]);

  const kinds: { value: BroadcastKind; label: string }[] = [
    { value: "announcement", label: "Anuncio" },
    { value: "schedule_change", label: "Horario" },
    { value: "location_change", label: "Lugar" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-2xl border border-[#39FF14]/30 bg-[#39FF14]/5 px-4 py-4 flex flex-col gap-3">
        {/* Kind selector */}
        <div className="flex gap-2 flex-wrap">
          {kinds.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.15em] font-[family-name:var(--font-space-mono)] border transition-colors min-h-[36px] ${
                kind === k.value
                  ? "bg-[#39FF14] text-cave-black border-[#39FF14]"
                  : "border-cave-ash/40 text-cave-smoke hover:border-cave-ash"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {/* Title (optional) */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (opcional)"
          maxLength={100}
          className="w-full bg-cave-stone/60 border border-cave-ash/40 rounded-xl px-3 py-2.5 text-sm text-cave-white placeholder-cave-ash font-[family-name:var(--font-inter)] focus:outline-none focus:border-[#39FF14]/60 min-h-[44px]"
        />

        {/* Body */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribí tu mensaje…"
          maxLength={1000}
          rows={3}
          className="w-full bg-cave-stone/60 border border-cave-ash/40 rounded-xl px-3 py-2.5 text-sm text-cave-white placeholder-cave-ash font-[family-name:var(--font-inter)] focus:outline-none focus:border-[#39FF14]/60 resize-none"
        />

        {error && (
          <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={posting}
            className="px-4 py-2 rounded-full border border-cave-ash/40 text-cave-smoke text-xs font-[family-name:var(--font-space-mono)] uppercase tracking-[0.1em] hover:border-cave-fog hover:text-cave-white transition-colors min-h-[40px] disabled:opacity-40"
          >
            Cancelar
          </button>
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={posting || !body.trim()}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="px-5 py-2 rounded-full bg-[#39FF14] text-cave-black text-xs font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-space-mono)] disabled:opacity-50 min-h-[40px]"
          >
            {posting ? "Publicando…" : "Publicar"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Composer — poll form ─────────────────────────────────────────────────────

interface PollFormProps {
  onPost: (question: string, options: string[]) => Promise<void>;
  onCancel: () => void;
}

function PollForm({ onPost, onCancel }: PollFormProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addOption = useCallback(() => {
    if (options.length >= 10) return;
    setOptions((prev) => [...prev, ""]);
  }, [options.length]);

  const removeOption = useCallback((index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateOption = useCallback((index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!question.trim()) {
      setError("La pregunta no puede estar vacía.");
      return;
    }
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      setError("Necesitás al menos 2 opciones.");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      await onPost(question.trim(), validOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la encuesta.");
    } finally {
      setPosting(false);
    }
  }, [question, options, onPost]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-2xl border border-cave-ash/40 bg-cave-stone/40 px-4 py-4 flex flex-col gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-cave-smoke font-[family-name:var(--font-space-mono)]">
          Nueva encuesta
        </p>

        {/* Question */}
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="¿Cuál es tu pregunta?"
          maxLength={200}
          className="w-full bg-cave-stone/60 border border-cave-ash/40 rounded-xl px-3 py-2.5 text-sm text-cave-white placeholder-cave-ash font-[family-name:var(--font-inter)] focus:outline-none focus:border-cave-fog/60 min-h-[44px]"
        />

        {/* Options */}
        <div className="flex flex-col gap-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Opción ${i + 1}`}
                maxLength={100}
                className="flex-1 bg-cave-stone/60 border border-cave-ash/40 rounded-xl px-3 py-2.5 text-sm text-cave-white placeholder-cave-ash font-[family-name:var(--font-inter)] focus:outline-none focus:border-cave-fog/60 min-h-[44px]"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-[#FF2D7B]/30 text-[#FF2D7B] hover:bg-[#FF2D7B]/10 transition-colors flex-shrink-0"
                  aria-label="Eliminar opción"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add option */}
        {options.length < 10 && (
          <button
            type="button"
            onClick={addOption}
            className="flex items-center gap-1.5 text-[11px] text-cave-smoke font-[family-name:var(--font-space-mono)] hover:text-cave-white transition-colors min-h-[36px]"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Agregar opción
          </button>
        )}

        {error && (
          <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={posting}
            className="px-4 py-2 rounded-full border border-cave-ash/40 text-cave-smoke text-xs font-[family-name:var(--font-space-mono)] uppercase tracking-[0.1em] hover:border-cave-fog hover:text-cave-white transition-colors min-h-[40px] disabled:opacity-40"
          >
            Cancelar
          </button>
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={posting}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="px-5 py-2 rounded-full border border-cave-ash/60 text-cave-white text-xs font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-space-mono)] hover:border-cave-fog disabled:opacity-50 min-h-[40px]"
          >
            {posting ? "Creando…" : "Crear encuesta"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── BroadcastChannel ─────────────────────────────────────────────────────────

export function BroadcastChannel({ communityId, role }: BroadcastChannelProps) {
  const { user } = useAuth();
  const { broadcasts, loading, error, post, poll, vote } =
    useBroadcasts(communityId);

  const [composerMode, setComposerMode] = useState<ComposerMode>("idle");

  const canPost = isAdmin(role);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handlePostAnnouncement = useCallback(
    async (kind: BroadcastKind, title: string, body: string) => {
      await post({ kind, title: title || undefined, body });
      setComposerMode("idle");
    },
    [post]
  );

  const handleCreatePoll = useCallback(
    async (question: string, options: string[]) => {
      await poll({ body: question, options });
      setComposerMode("idle");
    },
    [poll]
  );

  const handleCancel = useCallback(() => setComposerMode("idle"), []);

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 border-2 border-cave-ash border-t-[#39FF14] rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)] text-center py-4">
        Error al cargar los mensajes
      </p>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">
      {/* ── Admin composer trigger ─────────────────────────────────── */}
      {canPost && composerMode === "idle" && (
        <div className="flex gap-2 mb-4">
          <motion.button
            type="button"
            onClick={() => setComposerMode("announcement")}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 h-[44px] flex items-center justify-center gap-2 rounded-full border border-cave-smoke text-cave-light text-[11px] uppercase tracking-[0.12em] font-[family-name:var(--font-space-mono)] hover:bg-white/10 hover:border-cave-light hover:text-cave-white transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Publicar
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setComposerMode("poll")}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 h-[44px] flex items-center justify-center gap-2 rounded-full border border-cave-ash/40 text-cave-smoke text-[11px] uppercase tracking-[0.12em] font-[family-name:var(--font-space-mono)] hover:border-cave-fog hover:text-cave-white transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Encuesta
          </motion.button>
        </div>
      )}

      {/* ── Composer forms ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {composerMode === "announcement" && (
          <AnnouncementForm
            key="announcement"
            onPost={handlePostAnnouncement}
            onCancel={handleCancel}
          />
        )}
        {composerMode === "poll" && (
          <PollForm
            key="poll"
            onPost={handleCreatePoll}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>

      {/* ── Broadcast list ─────────────────────────────────────────── */}
      {broadcasts.length === 0 ? (
        <div className="py-8 flex flex-col items-center gap-2">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-cave-ash"
          >
            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" />
            <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
          </svg>
          <p className="text-xs text-cave-ash font-[family-name:var(--font-space-mono)] text-center">
            {canPost
              ? "Publicá el primer anuncio de esta comunidad"
              : "Todavía no hay anuncios en este canal"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mt-1">
          <AnimatePresence initial={false}>
            {broadcasts.map((b) => (
              <BroadcastItem
                key={b.id}
                broadcast={b}
                onVote={vote}
                userId={user?.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
