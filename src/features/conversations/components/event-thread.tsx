"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConversation } from "../hooks/use-conversation";
import { useAudioRecorder } from "../hooks/use-audio-recorder";
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

// ─── Format seconds as m:ss ───────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
        className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-cave-rock"
      />
    );
  }
  return (
    <div className="w-7 h-7 rounded-full flex-shrink-0 bg-cave-stone flex items-center justify-center ring-1 ring-cave-rock">
      <span className="text-[9px] text-cave-fog font-[family-name:var(--font-space-mono)]">
        {initials}
      </span>
    </div>
  );
}

// ─── Image lightbox (minimal fixed overlay) ───────────────────────────────
interface LightboxProps {
  src: string;
  onClose: () => void;
}

function Lightbox({ src, onClose }: LightboxProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Vista ampliada de imagen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Media adjunta"
          className="max-w-[92vw] max-h-[88vh] rounded-xl object-contain select-none"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar imagen"
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── MediaContent — renders image or audio in a bubble ────────────────────
interface MediaContentProps {
  mediaUrl: string;
  mediaType: "image" | "audio";
  durationSeconds: number | null;
  onImageClick: (url: string) => void;
}

function MediaContent({ mediaUrl, mediaType, durationSeconds, onImageClick }: MediaContentProps) {
  if (mediaType === "image") {
    return (
      <button
        type="button"
        onClick={() => onImageClick(mediaUrl)}
        className="block mt-1.5 rounded-xl overflow-hidden max-w-[220px] ring-1 ring-cave-rock/60 hover:ring-[#FFFFFF]/30 transition-all"
        aria-label="Ver imagen en tamaño completo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt="Imagen adjunta"
          className="w-full max-h-[200px] object-cover"
          loading="lazy"
        />
      </button>
    );
  }

  // Audio player — minimal punk style
  return (
    <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-xl bg-cave-ash/40 border border-cave-rock/60 max-w-[220px]">
      {/* Native audio element — hidden, controlled programmatically */}
      {/* We use a simple <audio controls> for accessibility + minimal implementation */}
      <audio
        src={mediaUrl}
        controls
        preload="metadata"
        className="w-full h-8"
        style={{ colorScheme: "dark" }}
        aria-label="Audio adjunto"
      />
      {durationSeconds != null && (
        <span className="text-[9px] text-cave-fog font-[family-name:var(--font-space-mono)] whitespace-nowrap flex-shrink-0">
          {formatDuration(durationSeconds)}
        </span>
      )}
    </div>
  );
}

// ─── Single message bubble ─────────────────────────────────────────────────
interface MessageBubbleProps {
  message: MessageWithAuthor;
  currentUserId: string | undefined;
  onReply: (messageId: string, authorName: string) => void;
  onDelete: (messageId: string) => Promise<void>;
  onImageClick: (url: string) => void;
  isReply?: boolean;
  /** When true, omit the avatar + author header (grouped consecutive messages) */
  grouped?: boolean;
}

function MessageBubble({ message, currentUserId, onReply, onDelete, onImageClick, isReply, grouped }: MessageBubbleProps) {
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

  const hasMedia = message.media_url != null && message.media_type != null;

  // Official CAVES-authored messages get a dedicated identity
  if (message.is_official) {
    return (
      <div className="group relative flex gap-2.5 px-2 py-1 rounded-lg hover:bg-cave-stone/20 transition-colors">
        {/* Punk left-accent on hover */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-[#FFFFFF] opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* CAVES logo avatar */}
        <div className="w-7 h-7 rounded-full flex-shrink-0 bg-[#FFFFFF] flex items-center justify-center ring-1 ring-white/20 mt-0.5">
          <span className="text-[7px] font-bold text-cave-black font-[family-name:var(--font-space-mono)] leading-none">
            CAV
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Identity row: name + badge + timestamp */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[#FFFFFF] font-[family-name:var(--font-space-mono)] leading-none">
              CAVES
            </span>
            {/* Official badge */}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cave-white/10 border border-cave-white/20">
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[8px] text-cave-white font-bold uppercase tracking-[0.1em] font-[family-name:var(--font-space-mono)] leading-none">
                oficial
              </span>
            </span>
            <span className="text-[9px] text-cave-smoke font-[family-name:var(--font-space-mono)]">
              {relativeTime(message.created_at)}
            </span>
          </div>

          {/* Body */}
          {message.is_deleted ? (
            <p className="text-[12px] text-cave-smoke italic mt-0.5 font-[family-name:var(--font-inter)] leading-[1.5]">
              mensaje eliminado
            </p>
          ) : (
            <>
              {message.body && (
                <p className="text-[13px] text-cave-light leading-[1.55] mt-0.5 font-[family-name:var(--font-inter)] break-words">
                  {message.body}
                </p>
              )}
              {hasMedia && (
                <MediaContent
                  mediaUrl={message.media_url!}
                  mediaType={message.media_type!}
                  durationSeconds={message.media_duration_seconds}
                  onImageClick={onImageClick}
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative flex gap-2.5 px-2 rounded-lg hover:bg-cave-stone/20 transition-colors ${grouped ? "py-0.5" : "pt-1.5 pb-0.5"}`}>
      {/* Punk left-accent line on hover */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-[#FFFFFF] opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Avatar column — always reserve the space for alignment; hide when grouped */}
      <div className="w-7 flex-shrink-0 mt-0.5">
        {!grouped && (
          <Avatar url={message.author?.avatar_url ?? null} username={authorName} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row: author name + timestamp — hidden when grouped */}
        {!grouped && (
          <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
            <span className="text-[11px] font-semibold text-[#FFFFFF] font-[family-name:var(--font-space-mono)] leading-none truncate max-w-[180px]">
              @{authorName}
            </span>
            <span className="text-[9px] text-cave-smoke font-[family-name:var(--font-space-mono)]">
              {relativeTime(message.created_at)}
            </span>
          </div>
        )}

        {/* Body — comfortable line-height for readability */}
        {message.is_deleted ? (
          <p className="text-[12px] text-cave-smoke italic font-[family-name:var(--font-inter)] leading-[1.5]">
            mensaje eliminado
          </p>
        ) : (
          <>
            {message.body && (
              <p className="text-[13px] text-cave-light leading-[1.55] font-[family-name:var(--font-inter)] break-words">
                {message.body}
              </p>
            )}
            {hasMedia && (
              <MediaContent
                mediaUrl={message.media_url!}
                mediaType={message.media_type!}
                durationSeconds={message.media_duration_seconds}
                onImageClick={onImageClick}
              />
            )}
          </>
        )}

        {/* Actions — visible on group-hover; subtle, Discord-like */}
        {!message.is_deleted && (
          <div className="flex items-center gap-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Reply — only on top-level messages */}
            {!isReply && currentUserId && (
              <button
                type="button"
                onClick={() => onReply(message.id, authorName)}
                className="text-[10px] text-cave-fog hover:text-[#FFFFFF] transition-colors font-[family-name:var(--font-space-mono)] min-h-[22px] flex items-center gap-1"
              >
                <span className="opacity-60">›</span> responder
              </button>
            )}

            {/* Delete — only own messages */}
            {isOwn && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-[10px] text-[#FF2D7B]/50 hover:text-[#FF2D7B] transition-colors font-[family-name:var(--font-space-mono)] min-h-[22px] flex items-center disabled:opacity-40"
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

// ─── Grouping helper ────────────────────────────────────────────────────────
// Messages from the same author within 5 minutes of the previous one are
// considered "grouped": the avatar and name header are hidden for a cleaner log.
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function isGrouped(prev: MessageWithAuthor | undefined, curr: MessageWithAuthor): boolean {
  if (!prev || !curr.author || !prev.author) return false;
  if (prev.author.id !== curr.author.id) return false;
  const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
  return diff < GROUP_WINDOW_MS;
}

// ─── ImagePreviewThumb — shows a chosen image before sending ──────────────
interface ImagePreviewThumbProps {
  file: File;
  onRemove: () => void;
}

function ImagePreviewThumb({ file, onRemove }: ImagePreviewThumbProps) {
  const [objectUrl, setObjectUrl] = useState<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!objectUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="relative inline-flex"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={objectUrl}
        alt="Vista previa"
        className="h-16 w-16 object-cover rounded-xl ring-1 ring-[#FFFFFF]/20"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar imagen"
        className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-[#FF2D7B] text-white"
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </motion.div>
  );
}

// ─── AudioPreview — tiny player for the recorded blob before sending ───────
interface AudioPreviewProps {
  blob: Blob;
  durationSeconds: number;
  onRemove: () => void;
}

function AudioPreview({ blob, durationSeconds, onRemove }: AudioPreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  if (!objectUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cave-ash/40 border border-cave-rock ring-1 ring-[#FFFFFF]/10"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFFFFF" className="flex-shrink-0">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
        <line x1="12" y1="19" x2="12" y2="23" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
        <line x1="8" y1="23" x2="16" y2="23" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <audio src={objectUrl} controls preload="metadata" className="h-7 flex-1" style={{ colorScheme: "dark" }} />
      <span className="text-[9px] text-cave-fog font-[family-name:var(--font-space-mono)] whitespace-nowrap">
        {formatDuration(durationSeconds)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Cancelar audio"
        className="w-5 h-5 flex items-center justify-center rounded-full bg-[#FF2D7B]/80 hover:bg-[#FF2D7B] text-white transition-colors flex-shrink-0"
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </motion.div>
  );
}

// ─── RecordingIndicator — shown while mic is active ───────────────────────
interface RecordingIndicatorProps {
  elapsedSeconds: number;
  onStop: () => void;
  onCancel: () => void;
}

function RecordingIndicator({ elapsedSeconds, onStop, onCancel }: RecordingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-cave-ash/40 border border-[#FF2D7B]/40 ring-1 ring-[#FF2D7B]/20"
    >
      {/* Pulsing red dot */}
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2D7B] opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF2D7B]" />
      </span>
      <span className="text-[11px] text-cave-fog font-[family-name:var(--font-space-mono)] flex-1">
        Grabando {formatDuration(elapsedSeconds)}
      </span>
      <button
        type="button"
        onClick={onStop}
        className="text-[10px] text-[#FFFFFF] font-[family-name:var(--font-space-mono)] min-h-[28px] px-2 rounded-lg bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 transition-colors"
      >
        detener
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-[10px] text-[#FF2D7B]/70 hover:text-[#FF2D7B] font-[family-name:var(--font-space-mono)] min-h-[28px] px-1 transition-colors"
      >
        cancelar
      </button>
    </motion.div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────
interface ComposerProps {
  replyTo: { id: string; author: string } | null;
  onCancelReply: () => void;
  onSubmit: (body: string, parentId: string | null) => Promise<void>;
  onSubmitMedia: (
    file: File | Blob,
    kind: "image" | "audio",
    opts?: { body?: string; durationSeconds?: number }
  ) => Promise<void>;
}

function Composer({ replyTo, onCancelReply, onSubmit, onSubmitMedia }: ComposerProps) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image attachment state
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Audio recorder
  const recorder = useAudioRecorder();

  // ── Auto-focus when replying ─────────────────────────────────────────────
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  // ── Image picker ─────────────────────────────────────────────────────────
  const handleImagePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX = 10 * 1024 * 1024;
    if (file.size > MAX) {
      setError("La imagen no puede superar los 10 MB.");
      return;
    }
    setError(null);
    setImageFile(file);
    // Reset file input so same file can be picked again after removal
    e.target.value = "";
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setError(null);
  }, []);

  // ── Audio recorder controls ───────────────────────────────────────────────
  const handleMicClick = useCallback(async () => {
    if (recorder.state === "idle" || recorder.state === "denied") {
      await recorder.start();
    }
  }, [recorder]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (posting) return;

    const trimmed = text.trim();

    // Media-only or media+text send
    if (imageFile) {
      setError(null);
      setPosting(true);
      try {
        await onSubmitMedia(imageFile, "image", trimmed ? { body: trimmed } : undefined);
        setImageFile(null);
        setText("");
        onCancelReply();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al enviar la imagen.";
        setError(msg);
      } finally {
        setPosting(false);
      }
      return;
    }

    // Audio ready to send
    if (recorder.blob && recorder.durationSeconds != null) {
      setError(null);
      setPosting(true);
      try {
        await onSubmitMedia(recorder.blob, "audio", {
          durationSeconds: recorder.durationSeconds,
          body: trimmed || undefined,
        });
        recorder.reset();
        setText("");
        onCancelReply();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al enviar el audio.";
        setError(msg);
      } finally {
        setPosting(false);
      }
      return;
    }

    // Text-only send
    if (!trimmed) return;
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
  }, [text, posting, imageFile, recorder, onSubmit, onSubmitMedia, replyTo, onCancelReply]);

  // ── Derived: is the send button active? ──────────────────────────────────
  const hasContent =
    text.trim().length > 0 ||
    imageFile != null ||
    (recorder.blob != null && recorder.durationSeconds != null);

  const isRecording = recorder.state === "recording";
  const isRequesting = recorder.state === "requesting";

  // Auto-resize textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {/* ── Reply banner ─────────────────────────────────────────────────── */}
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

      {/* ── Recording state ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isRecording && (
          <RecordingIndicator
            elapsedSeconds={recorder.elapsedSeconds}
            onStop={recorder.stop}
            onCancel={recorder.cancel}
          />
        )}
      </AnimatePresence>

      {/* ── Previews (image or audio blob) ───────────────────────────────── */}
      <AnimatePresence>
        {imageFile && !isRecording && (
          <div className="flex items-center gap-2 px-1">
            <ImagePreviewThumb file={imageFile} onRemove={handleRemoveImage} />
          </div>
        )}
        {recorder.blob != null && recorder.durationSeconds != null && !isRecording && (
          <AudioPreview
            blob={recorder.blob}
            durationSeconds={recorder.durationSeconds}
            onRemove={recorder.reset}
          />
        )}
      </AnimatePresence>

      {/* ── Input row ──────────────────────────────────────────────────────── */}
      {!isRecording && (
        <div className="flex items-end gap-2">
          {/* Hidden file input for images */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleImagePick}
          />

          {/* Image attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={posting || recorder.blob != null}
            aria-label="Adjuntar imagen"
            className="w-[44px] h-[44px] flex-shrink-0 flex items-center justify-center rounded-full text-cave-fog hover:text-[#FFFFFF] hover:bg-cave-ash/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          {/* Mic button — only if MediaRecorder is supported */}
          {recorder.supported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={posting || isRequesting || imageFile != null || recorder.blob != null}
              aria-label={recorder.state === "denied" ? "Micrófono bloqueado" : "Grabar audio"}
              className={`w-[44px] h-[44px] flex-shrink-0 flex items-center justify-center rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                ${recorder.state === "denied"
                  ? "text-[#FF2D7B]/70"
                  : "text-cave-fog hover:text-[#FFFFFF] hover:bg-cave-ash/40"
                }`}
            >
              {isRequesting ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          )}

          {/* Text input */}
          <div className="flex-1 relative">
            <label className="sr-only">
              {replyTo ? `Responder a @${replyTo.author}` : "Escribí un mensaje"}
            </label>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              placeholder={
                imageFile
                  ? "Agregar texto (opcional)..."
                  : recorder.blob
                  ? "Agregar texto (opcional)..."
                  : replyTo
                  ? `Responder a @${replyTo.author}...`
                  : "Escribí un mensaje..."
              }
              rows={1}
              maxLength={2000}
              className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-cave-ash/30 border border-cave-rock text-[#FFFFFF] placeholder:text-cave-smoke focus:outline-none focus:border-[#FFFFFF] focus:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition-all resize-none overflow-hidden scrollbar-none font-[family-name:var(--font-inter)] text-[13px] leading-5"
              style={{ height: "44px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
            />
            {/* Character hint — subtle, only near the 2000 limit */}
            {text.length > 1800 && (
              <span className={`absolute right-2 bottom-1.5 text-[9px] font-[family-name:var(--font-space-mono)] ${text.length >= 1990 ? "text-[#FF2D7B]" : "text-cave-smoke"}`}>
                {2000 - text.length}
              </span>
            )}
          </div>

          {/* Send button */}
          <motion.button
            type="submit"
            disabled={!hasContent || posting}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="w-[44px] h-[44px] flex-shrink-0 flex items-center justify-center rounded-full bg-[#FFFFFF] text-cave-black disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
            aria-label="Enviar mensaje"
          >
            {posting ? (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </motion.button>
        </div>
      )}

      {/* ── Error area ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(error || recorder.errorMessage) && (
          <motion.p
            key="composer-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.12 }}
            className="text-[11px] text-[#FF2D7B] font-[family-name:var(--font-space-mono)] leading-4"
          >
            {error ?? recorder.errorMessage}
          </motion.p>
        )}
      </AnimatePresence>
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
  const { messages, loading, error, post, reply, remove, postMedia } = useConversation(subjectType, subjectId);
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
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

  const handleSubmitMedia = useCallback(
    async (
      file: File | Blob,
      kind: "image" | "audio",
      opts?: { body?: string; durationSeconds?: number }
    ) => {
      await postMedia(file, kind, opts);
    },
    [postMedia]
  );

  const handleReply = useCallback((messageId: string, authorName: string) => {
    setReplyTo({ id: messageId, author: authorName });
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleImageClick = useCallback((url: string) => {
    setLightboxSrc(url);
  }, []);

  const handleLightboxClose = useCallback(() => {
    setLightboxSrc(null);
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
    <>
      {/* Lightbox — rendered at component root so it overlays everything */}
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={handleLightboxClose} />
      )}

      {/* Contained chat box: scrollable messages + pinned composer */}
      <div className="flex flex-col rounded-xl border border-cave-rock overflow-hidden bg-[#070707]">
        {/* ── Scrollable message area ─────────────────────────────────────── */}
        <div className="flex flex-col overflow-y-auto max-h-80 py-2 px-1 scrollbar-none">
          {threads.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[11px] text-cave-smoke font-[family-name:var(--font-space-mono)] leading-5">
                Todavía no hay mensajes —<br />arrancá la conversación
              </p>
            </div>
          ) : (
            threads.map((thread, threadIdx) => {
              // For root messages, compare against the last root of the previous thread
              const prevRootMsg = threadIdx > 0 ? threads[threadIdx - 1] : undefined;
              const rootGrouped = isGrouped(prevRootMsg, thread);
              return (
                <div key={thread.id} className="flex flex-col">
                  {/* Thin divider between thread groups (not within a group) */}
                  {threadIdx > 0 && !rootGrouped && (
                    <div className="h-px bg-cave-rock/50 mx-3 my-1" />
                  )}

                  {/* Root message */}
                  <MessageBubble
                    message={thread}
                    currentUserId={currentUserId}
                    onReply={handleReply}
                    onDelete={remove}
                    onImageClick={handleImageClick}
                    grouped={rootGrouped}
                  />

                  {/* Replies — one level only, indented with left rule */}
                  {thread.replies.length > 0 && (
                    <div className="flex flex-col border-l border-cave-ash/25 ml-[26px] pl-3 mt-0.5 mb-0.5">
                      {thread.replies.map((r, rIdx) => (
                        <MessageBubble
                          key={r.id}
                          message={r}
                          currentUserId={currentUserId}
                          onReply={handleReply}
                          onDelete={remove}
                          onImageClick={handleImageClick}
                          isReply
                          grouped={isGrouped(rIdx > 0 ? thread.replies[rIdx - 1] : undefined, r)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Composer / footer — pinned at bottom ────────────────────────── */}
        <div className="border-t border-cave-rock/80 px-3 py-2.5">
          {currentUserId ? (
            canWrite ? (
              <Composer
                replyTo={replyTo}
                onCancelReply={handleCancelReply}
                onSubmit={handleSubmit}
                onSubmitMedia={handleSubmitMedia}
              />
            ) : (
              /* Read-only notice for admins_only channels */
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cave-stone/40 border border-cave-ash/20">
                <svg
                  width="11"
                  height="11"
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
                <p className="text-[10px] text-cave-fog font-[family-name:var(--font-space-mono)] uppercase tracking-[0.08em]">
                  Solo administradores pueden escribir
                </p>
              </div>
            )
          ) : (
            /* Logged-out sign-in affordance */
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-[11px] text-cave-smoke font-[family-name:var(--font-space-mono)] text-center leading-5">
                Iniciá sesión para participar en la conversación
              </p>
              <button
                type="button"
                onClick={onSignInRequest}
                className="h-[44px] px-6 rounded-full border border-cave-light/60 text-cave-white text-xs font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-space-mono)] hover:bg-white/10 hover:border-cave-white transition-colors"
              >
                Iniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
