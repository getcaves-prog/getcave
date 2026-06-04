"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { listMembers, promoteMember, removeMember } from "../services/community.service";
import type { MemberWithProfile, MemberRole } from "../types/community.types";

// ─── Props ────────────────────────────────────────────────────────────────

interface MembersManagerProps {
  communityId: string;
  currentUserRole: MemberRole;
  currentUserId: string;
  onClose: () => void;
  onChanged?: () => void; // called after promote/kick so parent can refresh
}

// ─── Role badge ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: MemberRole }) {
  if (role === "owner") {
    return (
      <span className="px-2 py-0.5 rounded-full border border-[#FFFFFF]/50 text-[9px] uppercase tracking-[0.15em] text-[#FFFFFF] font-bold font-[family-name:var(--font-space-mono)]">
        owner
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="px-2 py-0.5 rounded-full border border-[#FFFFFF]/30 text-[9px] uppercase tracking-[0.15em] text-[#FFFFFF]/80 font-[family-name:var(--font-space-mono)]">
        admin
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full border border-cave-ash/40 text-[9px] uppercase tracking-[0.15em] text-cave-smoke font-[family-name:var(--font-space-mono)]">
      miembro
    </span>
  );
}

// ─── Confirm kick dialog ──────────────────────────────────────────────────

interface KickConfirmProps {
  username: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function KickConfirm({ username, onConfirm, onCancel, loading }: KickConfirmProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="mx-4 mb-3 rounded-xl border border-[#FF2D7B]/40 bg-cave-stone/80 px-4 py-3 flex flex-col gap-3"
    >
      <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)] leading-5">
        ¿Expulsar a{" "}
        <span className="text-[#FFFFFF] font-bold">@{username}</span>?
        Esta acción no se puede deshacer.
      </p>
      <div className="flex gap-2">
        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex-1 h-[44px] rounded-full bg-[#FF2D7B] text-white text-xs font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-space-mono)] disabled:opacity-40"
        >
          {loading ? "Expulsando..." : "Expulsar"}
        </motion.button>
        <motion.button
          type="button"
          onClick={onCancel}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="flex-1 h-[44px] rounded-full border border-cave-ash text-cave-smoke text-xs font-[family-name:var(--font-space-mono)] uppercase tracking-[0.1em] disabled:opacity-40"
        >
          Cancelar
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── MemberRow ────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: MemberWithProfile;
  currentUserId: string;
  currentUserRole: MemberRole;
  onPromote: (userId: string, role: MemberRole) => Promise<void>;
  onKick: (userId: string, username: string) => void;
}

function MemberRow({
  member,
  currentUserId,
  currentUserRole,
  onPromote,
  onKick,
}: MemberRowProps) {
  const [promoting, setPromoting] = useState(false);
  const username = member.profile?.username ?? "unknown";
  const avatarUrl = member.profile?.avatar_url ?? null;
  const initials = username.slice(0, 2).toUpperCase();
  const memberRole = member.role as MemberRole;

  const isSelf = member.user_id === currentUserId;
  const isOwner = memberRole === "owner";
  // Nobody can act on the owner row; can't act on self here either
  const canActOnThisRow = !isOwner && !isSelf;

  const handlePromote = async () => {
    const targetRole: MemberRole = memberRole === "admin" ? "member" : "admin";
    setPromoting(true);
    try {
      await onPromote(member.user_id, targetRole);
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-cave-ash/10 last:border-b-0">
      {/* Avatar */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-cave-stone flex-shrink-0 ring-1 ring-cave-ash/20">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-[10px] text-cave-fog font-[family-name:var(--font-space-mono)]">
            {initials}
          </span>
        )}
      </div>

      {/* Identity + role */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cave-white font-[family-name:var(--font-space-mono)] truncate leading-5">
          @{username}
          {isSelf && (
            <span className="ml-1.5 text-[9px] text-cave-smoke uppercase tracking-[0.1em]">
              (vos)
            </span>
          )}
        </p>
        <div className="mt-0.5">
          <RoleBadge role={memberRole} />
        </div>
      </div>

      {/* Admin actions — hidden for owner row + self row */}
      {canActOnThisRow && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Promote / demote */}
          <motion.button
            type="button"
            onClick={handlePromote}
            disabled={promoting}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="h-[36px] px-3 rounded-full border border-[#FFFFFF]/30 text-[10px] uppercase tracking-[0.1em] text-[#FFFFFF]/80 font-[family-name:var(--font-space-mono)] hover:border-[#FFFFFF]/60 hover:text-[#FFFFFF] transition-colors disabled:opacity-40"
            aria-label={memberRole === "admin" ? `Degradar a @${username}` : `Promover a @${username}`}
          >
            {promoting
              ? "..."
              : memberRole === "admin"
              ? "Degradar"
              : "Promover"}
          </motion.button>

          {/* Kick */}
          <motion.button
            type="button"
            onClick={() => onKick(member.user_id, username)}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="h-[36px] w-[36px] flex items-center justify-center rounded-full border border-[#FF2D7B]/40 text-[#FF2D7B] hover:border-[#FF2D7B]/70 hover:bg-[#FF2D7B]/10 transition-colors"
            aria-label={`Expulsar a @${username}`}
          >
            <svg
              width="13"
              height="13"
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
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ─── MembersManager — main component ─────────────────────────────────────

export function MembersManager({
  communityId,
  currentUserRole,
  currentUserId,
  onClose,
  onChanged,
}: MembersManagerProps) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kick confirmation state: userId + username being confirmed, or null
  const [kickTarget, setKickTarget] = useState<{ userId: string; username: string } | null>(null);
  const [kicking, setKicking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMembers(communityId);
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar miembros");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePromote = useCallback(
    async (userId: string, role: MemberRole) => {
      setActionError(null);
      try {
        await promoteMember(communityId, userId, role);
        // Optimistic refresh
        await load();
        onChanged?.();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Error al cambiar rol");
      }
    },
    [communityId, load, onChanged]
  );

  const handleKickConfirm = useCallback(async () => {
    if (!kickTarget) return;
    setKicking(true);
    setActionError(null);
    try {
      await removeMember(communityId, kickTarget.userId);
      setKickTarget(null);
      await load();
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al expulsar miembro");
    } finally {
      setKicking(false);
    }
  }, [kickTarget, communityId, load, onChanged]);

  // Reduce motion
  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const spring = prefersReduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 30 };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="members-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={prefersReduced ? { duration: 0 } : { duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        key="members-sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={spring}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] flex flex-col rounded-t-2xl bg-[#0A0A0A] border-t border-cave-ash/20 safe-area-bottom"
      >
        {/* Handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-cave-ash/40" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-cave-ash/10">
          <div>
            <h2 className="text-sm font-bold text-cave-white font-[family-name:var(--font-space-mono)] uppercase tracking-[0.15em]">
              Gestionar miembros
            </h2>
            {!loading && members.length > 0 && (
              <p className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)] mt-0.5">
                {members.length} {members.length === 1 ? "miembro" : "miembros"}
              </p>
            )}
          </div>
          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="w-[44px] h-[44px] flex items-center justify-center text-cave-fog hover:text-cave-white transition-colors"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </motion.button>
        </div>

        {/* Role legend — only if they can manage */}
        {(currentUserRole === "owner" || currentUserRole === "admin") && !loading && !error && members.length > 0 && (
          <div className="flex-shrink-0 px-5 py-2 bg-cave-stone/20 border-b border-cave-ash/10">
            <p className="text-[9px] text-cave-smoke font-[family-name:var(--font-space-mono)] uppercase tracking-[0.15em]">
              Promover → admin · Degradar → miembro · ✕ → expulsar
            </p>
          </div>
        )}

        {/* Action error */}
        <AnimatePresence>
          {actionError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-shrink-0 px-5 py-2 bg-[#FF2D7B]/10 border-b border-[#FF2D7B]/20"
            >
              <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
                {actionError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kick confirm */}
        <AnimatePresence>
          {kickTarget && (
            <div className="flex-shrink-0 pt-3">
              <KickConfirm
                username={kickTarget.username}
                onConfirm={handleKickConfirm}
                onCancel={() => setKickTarget(null)}
                loading={kicking}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-cave-fog border-t-[#FFFFFF] rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6">
              <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)] text-center">
                {error}
              </p>
              <motion.button
                type="button"
                onClick={load}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="h-[40px] px-5 rounded-full border border-cave-ash text-cave-fog text-xs font-[family-name:var(--font-space-mono)] uppercase tracking-[0.1em]"
              >
                Reintentar
              </motion.button>
            </div>
          ) : members.length === 0 ? (
            <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] text-center py-12">
              No hay miembros aún
            </p>
          ) : (
            <div>
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  onPromote={handlePromote}
                  onKick={(userId, username) => setKickTarget({ userId, username })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom safe area padding */}
        <div className="flex-shrink-0 h-6" />
      </motion.div>
    </AnimatePresence>
  );
}
