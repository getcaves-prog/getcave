"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getActivePoll, votePoll } from "../services/broadcast.service";
import type { ActivePoll } from "../types/community.types";

interface CommunityPollCardProps {
  communityId: string;
  isAuthenticated: boolean;
  onSignInRequest: () => void;
}

// ─── Days-until helper — null when no deadline ───────────────────────────────
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

// ─── ENCUESTA ACTIVA — poll widget ───────────────────────────────────────────
// Loads the active poll for the community, renders option chips with vote bars
// and counts, and lets the user vote (one vote, optimistic). Hides itself when
// there is no active poll.
export function CommunityPollCard({
  communityId,
  isAuthenticated,
  onSignInRequest,
}: CommunityPollCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [poll, setPoll] = useState<ActivePoll | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getActivePoll(communityId);
        if (!cancelled) setPoll(result);
      } catch {
        // Poll is optional — hide on failure.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  const handleVote = async (optionId: string) => {
    if (!isAuthenticated) {
      onSignInRequest();
      return;
    }
    if (!poll || poll.myVotedOptionId || voting) return;
    setVoting(true);
    // Optimistic update
    setPoll((prev) =>
      prev
        ? {
            ...prev,
            myVotedOptionId: optionId,
            totalVotes: prev.totalVotes + 1,
            options: prev.options.map((o) =>
              o.optionId === optionId
                ? { ...o, voteCount: o.voteCount + 1, myVote: true }
                : o
            ),
          }
        : prev
    );
    try {
      await votePoll(poll.broadcastId, optionId);
    } catch {
      // Revert on failure
      setPoll((prev) =>
        prev
          ? {
              ...prev,
              myVotedOptionId: null,
              totalVotes: Math.max(0, prev.totalVotes - 1),
              options: prev.options.map((o) =>
                o.optionId === optionId
                  ? { ...o, voteCount: Math.max(0, o.voteCount - 1), myVote: false }
                  : o
              ),
            }
          : prev
      );
    } finally {
      setVoting(false);
    }
  };

  // Hide gracefully when there is no active poll.
  if (!loaded || !poll) return null;

  const hasVoted = !!poll.myVotedOptionId;
  const total = poll.totalVotes;
  const days = daysUntil(poll.expiresAt);

  const metaParts: string[] = [`${total} ${total === 1 ? "voto" : "votos"}`];
  if (days !== null) {
    metaParts.push(days <= 0 ? "Termina hoy" : `Termina en ${days} ${days === 1 ? "día" : "días"}`);
  }

  return (
    <section className="bg-cave-rock border border-cave-ash/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <span className="border-l-2 border-cave-white/50 pl-2.5 text-[10px] uppercase tracking-[0.2em] text-cave-fog font-[family-name:var(--font-space-mono)]">
          Encuesta activa
        </span>
      </div>

      <p className="text-sm text-cave-white font-medium font-[family-name:var(--font-inter)] mt-3 mb-4 leading-snug">
        {poll.title ?? poll.body}
      </p>

      <div className="flex flex-col gap-2.5">
        {poll.options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0;
          const isMine = opt.myVote;
          return (
            <motion.button
              key={opt.optionId}
              type="button"
              onClick={() => handleVote(opt.optionId)}
              disabled={hasVoted || voting}
              whileTap={prefersReducedMotion || hasVoted ? undefined : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={`relative w-full overflow-hidden rounded-xl border text-left px-3.5 py-3 transition-colors ${
                isMine
                  ? "border-cave-white/70 bg-cave-white/5"
                  : "border-cave-ash/50 hover:border-cave-fog/50"
              } ${hasVoted ? "cursor-default" : "cursor-pointer"}`}
            >
              {/* Vote bar — only shown once results are visible (after voting) */}
              {hasVoted && (
                <motion.span
                  className="absolute inset-y-0 left-0 bg-cave-ash/40"
                  initial={prefersReducedMotion ? false : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  aria-hidden="true"
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  {isMine && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cave-white flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  <span
                    className={`text-sm font-[family-name:var(--font-inter)] truncate ${
                      isMine ? "text-cave-white font-medium" : "text-cave-light"
                    }`}
                  >
                    {opt.label}
                  </span>
                </span>
                {hasVoted && (
                  <span className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)] flex-shrink-0">
                    {pct}% · {opt.voteCount}
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-[0.1em] text-cave-smoke font-[family-name:var(--font-space-mono)]">
        {metaParts.join(" · ")}
      </p>
    </section>
  );
}
