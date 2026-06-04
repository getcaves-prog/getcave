"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EventThread } from "@/features/conversations/components/event-thread";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { useChannels } from "../hooks/use-channels";
import type { CommunityChannel, WritePermission } from "../types/community.types";

// ─── ChannelManager props ───────────────────────────────────────────────────

export interface ChannelManagerProps {
  communityId: string;
  currentUserId: string | undefined;
  isAdmin: boolean;
  onSignInRequest?: () => void;
}

// ─── LockIcon — small badge for admins_only channels ───────────────────────

function LockIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-cave-smoke flex-shrink-0"
      aria-label="Solo administradores"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ─── Channel chip / tab ─────────────────────────────────────────────────────

interface ChannelChipProps {
  channel: CommunityChannel;
  isSelected: boolean;
  onSelect: (channel: CommunityChannel) => void;
}

function ChannelChip({ channel, isSelected, onSelect }: ChannelChipProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(channel)}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-[family-name:var(--font-space-mono)] uppercase tracking-[0.12em] transition-colors min-h-[36px] flex-shrink-0 border ${
        isSelected
          ? "bg-[#FFFFFF] text-cave-black border-[#FFFFFF]"
          : "bg-transparent text-cave-fog border-cave-ash/60 hover:border-cave-ash hover:text-cave-white"
      }`}
    >
      <span># {channel.name}</span>
      {channel.write_permission === "admins_only" && !isSelected && <LockIcon />}
    </button>
  );
}

// ─── ChannelFormModal — create / edit ──────────────────────────────────────

interface ChannelFormModalProps {
  initial?: CommunityChannel | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    write_permission: WritePermission;
  }) => Promise<void>;
}

function ChannelFormModal({ initial, onClose, onSubmit }: ChannelFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [writePermission, setWritePermission] = useState<WritePermission>(
    (initial?.write_permission as WritePermission | undefined) ?? "everyone"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("El nombre del canal no puede estar vacío.");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        await onSubmit({ name: trimmedName, description: description.trim(), write_permission: writePermission });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Algo salió mal");
        setSubmitting(false);
      }
    },
    [name, description, writePermission, onSubmit, onClose]
  );

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-cave-black/80 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="w-full sm:max-w-md bg-[#0A0A0A] border border-cave-ash/40 rounded-t-3xl sm:rounded-2xl px-5 pt-6 pb-8 safe-area-bottom"
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Editar canal" : "Nuevo canal"}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-cave-ash/40 rounded-full mx-auto mb-5 sm:hidden" />

        <h2 className="text-sm font-bold text-cave-white font-[family-name:var(--font-space-mono)] uppercase tracking-[0.15em] mb-5">
          {initial ? "Editar canal" : "Nuevo canal"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.15em] text-cave-fog font-[family-name:var(--font-space-mono)]">
              Nombre *
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. general, anuncios, música"
              maxLength={60}
              className="w-full h-[44px] px-4 rounded-xl bg-cave-rock border border-cave-ash text-cave-white placeholder:text-cave-smoke focus:outline-none focus:border-[#FFFFFF] transition-colors font-[family-name:var(--font-inter)] text-sm"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.15em] text-cave-fog font-[family-name:var(--font-space-mono)]">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué trata este canal?"
              maxLength={200}
              className="w-full h-[44px] px-4 rounded-xl bg-cave-rock border border-cave-ash text-cave-white placeholder:text-cave-smoke focus:outline-none focus:border-[#FFFFFF] transition-colors font-[family-name:var(--font-inter)] text-sm"
            />
          </div>

          {/* Write permission toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.15em] text-cave-fog font-[family-name:var(--font-space-mono)]">
              Permisos de escritura
            </span>
            <div className="flex rounded-xl overflow-hidden border border-cave-ash/60">
              {(["everyone", "admins_only"] as WritePermission[]).map((perm) => (
                <button
                  key={perm}
                  type="button"
                  onClick={() => setWritePermission(perm)}
                  className={`flex-1 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] font-[family-name:var(--font-space-mono)] transition-colors min-h-[44px] ${
                    writePermission === perm
                      ? "bg-[#FFFFFF] text-cave-black"
                      : "text-cave-smoke hover:text-cave-white"
                  }`}
                >
                  {perm === "everyone" ? "Todos pueden escribir" : "Solo administradores"}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[48px] rounded-full border border-cave-ash text-cave-smoke font-[family-name:var(--font-space-mono)] text-xs uppercase tracking-[0.1em] hover:text-cave-white hover:border-cave-fog transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              type="submit"
              disabled={submitting}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="flex-1 h-[48px] rounded-full bg-[#FFFFFF] text-cave-black font-bold uppercase tracking-[0.15em] text-xs font-[family-name:var(--font-space-mono)] disabled:opacity-50"
            >
              {submitting ? "Guardando..." : initial ? "Guardar" : "Crear"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── DeleteConfirmModal ─────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  channelName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteConfirmModal({ channelName, onClose, onConfirm }: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el canal");
      setDeleting(false);
    }
  }, [onConfirm, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-cave-black/80 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="w-full sm:max-w-sm bg-[#0A0A0A] border border-cave-ash/40 rounded-t-3xl sm:rounded-2xl px-5 pt-6 pb-8 safe-area-bottom"
        role="dialog"
        aria-modal="true"
        aria-label="Eliminar canal"
      >
        <div className="w-10 h-1 bg-cave-ash/40 rounded-full mx-auto mb-5 sm:hidden" />

        <h2 className="text-sm font-bold text-cave-white font-[family-name:var(--font-space-mono)] uppercase tracking-[0.15em] mb-2">
          Eliminar canal
        </h2>
        <p className="text-xs text-cave-fog font-[family-name:var(--font-inter)] leading-5 mb-5">
          ¿Eliminás <span className="text-cave-white font-medium">#{channelName}</span>? Esta acción no se puede deshacer y se perderán todos los mensajes.
        </p>

        {error && (
          <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)] mb-3">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[48px] rounded-full border border-cave-ash text-cave-smoke font-[family-name:var(--font-space-mono)] text-xs uppercase tracking-[0.1em] hover:text-cave-white hover:border-cave-fog transition-colors"
          >
            Cancelar
          </button>
          <motion.button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 h-[48px] rounded-full bg-[#FF2D7B] text-cave-white font-bold uppercase tracking-[0.15em] text-xs font-[family-name:var(--font-space-mono)] disabled:opacity-50"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── ChannelManager — main export ──────────────────────────────────────────

export function ChannelManager({
  communityId,
  currentUserId,
  isAdmin,
  onSignInRequest,
}: ChannelManagerProps) {
  const { channels, loading, error, create, update, remove, refresh } =
    useChannels(communityId);

  // Selected channel id
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<CommunityChannel | null>(null);
  const [deletingChannel, setDeletingChannel] = useState<CommunityChannel | null>(null);

  // Auto-select first channel once loaded
  useEffect(() => {
    if (channels.length > 0 && !selectedId) {
      setSelectedId(channels[0].id);
    }
    // If selected channel was deleted, fall back to first
    if (selectedId && channels.length > 0) {
      const stillExists = channels.some((c) => c.id === selectedId);
      if (!stillExists) setSelectedId(channels[0].id);
    }
  }, [channels, selectedId]);

  const selectedChannel = channels.find((c) => c.id === selectedId) ?? null;

  // A non-admin can write only when the channel allows everyone
  const canWrite =
    isAdmin || selectedChannel?.write_permission === "everyone";

  const handleCreate = useCallback(
    async (data: { name: string; description: string; write_permission: WritePermission }) => {
      const channel = await create({
        name: data.name,
        description: data.description || undefined,
        write_permission: data.write_permission,
      });
      // Select the newly created channel
      setSelectedId(channel.id);
    },
    [create]
  );

  const handleUpdate = useCallback(
    async (data: { name: string; description: string; write_permission: WritePermission }) => {
      if (!editingChannel) return;
      await update(editingChannel.id, {
        name: data.name,
        description: data.description || undefined,
        write_permission: data.write_permission,
      });
    },
    [editingChannel, update]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingChannel) return;
    await remove(deletingChannel.id);
  }, [deletingChannel, remove]);

  // ─── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {/* Channel chip skeletons */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-9 w-20 rounded-full bg-cave-ash/20 animate-pulse flex-shrink-0"
            />
          ))}
        </div>
        {/* Message skeletons */}
        <div className="flex flex-col gap-3 mt-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-cave-ash/30 flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-2.5 w-20 rounded bg-cave-ash/30" />
                <div className="h-3 w-full rounded bg-cave-ash/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 flex flex-col items-center gap-3">
        <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)] text-center">
          Error al cargar los canales
        </p>
        <button
          type="button"
          onClick={refresh}
          className="text-[10px] text-cave-fog underline font-[family-name:var(--font-space-mono)]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center gap-3 rounded-2xl border border-cave-ash/20 bg-cave-stone/20">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cave-ash"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="text-xs text-cave-ash font-[family-name:var(--font-space-mono)] text-center px-4">
          Esta comunidad todavía no tiene canales
        </p>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-[44px] px-6 rounded-full bg-[#FFFFFF] text-cave-black font-bold text-xs uppercase tracking-[0.15em] font-[family-name:var(--font-space-mono)]"
          >
            + Crear primer canal
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Channels section heading ───────────────────────────────────── */}
      <SectionHeading
        trailing={
          isAdmin ? (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 text-[10px] text-cave-fog hover:text-cave-white transition-colors font-[family-name:var(--font-space-mono)] min-h-[28px] px-1"
              aria-label="Nuevo canal"
            >
              <svg
                width="11"
                height="11"
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
              Nuevo canal
            </button>
          ) : undefined
        }
      >
        Canales
      </SectionHeading>

      {/* ── Channel switcher (horizontal scroll) ──────────────────────── */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none"
        role="tablist"
        aria-label="Canales de la comunidad"
      >
        {channels.map((channel) => (
          <ChannelChip
            key={channel.id}
            channel={channel}
            isSelected={channel.id === selectedId}
            onSelect={(ch) => setSelectedId(ch.id)}
          />
        ))}
      </div>

      {/* ── Selected channel detail ────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {selectedChannel && (
          <motion.div
            key={selectedChannel.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, duration: 0.15 }}
            className="mt-4"
          >
            {/* Channel header with admin actions */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                  #{selectedChannel.name}
                </span>
                {selectedChannel.write_permission === "admins_only" && (
                  <LockIcon />
                )}
                {selectedChannel.description && (
                  <span className="text-[10px] text-cave-smoke font-[family-name:var(--font-inter)] truncate hidden sm:block">
                    — {selectedChannel.description}
                  </span>
                )}
              </div>

              {/* Admin actions: edit + delete */}
              {isAdmin && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => setEditingChannel(selectedChannel)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-cave-fog hover:text-cave-white hover:bg-cave-stone/60 transition-colors"
                    aria-label={`Editar canal ${selectedChannel.name}`}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>

                  {/* Delete — disabled for default channel */}
                  {!selectedChannel.is_default && (
                    <button
                      type="button"
                      onClick={() => setDeletingChannel(selectedChannel)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-[#FF2D7B]/60 hover:text-[#FF2D7B] hover:bg-[#FF2D7B]/10 transition-colors"
                      aria-label={`Eliminar canal ${selectedChannel.name}`}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Channel thread */}
            <EventThread
              subjectType="channel"
              subjectId={selectedChannel.id}
              currentUserId={currentUserId}
              onSignInRequest={onSignInRequest}
              canWrite={canWrite}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <ChannelFormModal
            key="create-modal"
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreate}
          />
        )}
        {editingChannel && (
          <ChannelFormModal
            key="edit-modal"
            initial={editingChannel}
            onClose={() => setEditingChannel(null)}
            onSubmit={handleUpdate}
          />
        )}
        {deletingChannel && (
          <DeleteConfirmModal
            key="delete-modal"
            channelName={deletingChannel.name}
            onClose={() => setDeletingChannel(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
}
