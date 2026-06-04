"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useRecaps } from "../hooks/use-recaps";
import {
  MAX_RECAP_FILE_SIZE_BYTES,
  ALLOWED_RECAP_MIME_PREFIXES,
} from "../types/recaps.types";
import type { EventMedia } from "../types/recaps.types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecapsGalleryProps {
  flyerId: string;
  /** True if the current user is the flyer owner (can delete any media). */
  isOwner?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

// ─── MediaThumbnail ───────────────────────────────────────────────────────────

interface MediaThumbnailProps {
  item: EventMedia;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onClick: () => void;
  deleting: boolean;
}

function MediaThumbnail({
  item,
  canDelete,
  onDelete,
  onClick,
  deleting,
}: MediaThumbnailProps) {
  const isVideo = item.media_type === "video";

  return (
    <div className="relative group aspect-square rounded-xl overflow-hidden bg-cave-stone border border-cave-ash/30">
      {/* Media content */}
      <button
        type="button"
        onClick={onClick}
        className="w-full h-full block"
        aria-label={isVideo ? "Ver video" : "Ver imagen"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail_url ?? item.media_url}
          alt={isVideo ? "Video del evento" : "Foto del evento"}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Video play overlay */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-white ml-0.5"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
        )}
      </button>

      {/* Delete button — visible on hover/focus, always visible while deleting */}
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          disabled={deleting}
          className={`absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-full border border-[#FF2D7B]/60 text-[#FF2D7B] transition-all ${
            deleting
              ? "opacity-100 bg-[#FF2D7B]/20"
              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 bg-black/70 hover:bg-[#FF2D7B]/20"
          } disabled:cursor-not-allowed`}
          aria-label="Eliminar"
        >
          {deleting ? (
            <div className="w-3 h-3 border border-[#FF2D7B] border-t-transparent rounded-full animate-spin" />
          ) : (
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

interface LightboxProps {
  items: EventMedia[];
  index: number;
  onClose: () => void;
  onNav: (next: number) => void;
}

function Lightbox({ items, index, onClose, onNav }: LightboxProps) {
  const item = items[index];
  if (!item) return null;
  const isVideo = item.media_type === "video";

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          // Videos open in a new tab for MVP simplicity (avoid building a
          // custom player). Tap area still blocks accidental modal close.
          <a
            href={item.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3"
            onClick={onClose}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnail_url ?? item.media_url}
              alt="Video"
              className="max-w-[90vw] max-h-[70vh] object-contain rounded-xl"
            />
            <span className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] underline">
              Abrir video
            </span>
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.media_url}
            alt="Foto del evento"
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl pointer-events-none"
          />
        )}
      </div>

      {/* Prev */}
      {index > 0 && (
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onNav(index - 1);
          }}
          aria-label="Anterior"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next */}
      {index < items.length - 1 && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onNav(index + 1);
          }}
          aria-label="Siguiente"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Close */}
      <button
        className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm border border-white/20"
        onClick={onClose}
        aria-label="Cerrar"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm">
        <span className="text-[10px] text-white font-[family-name:var(--font-space-mono)]">
          {index + 1} / {items.length}
        </span>
      </div>
    </motion.div>
  );
}

// ─── UploadButton ─────────────────────────────────────────────────────────────

interface UploadButtonProps {
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  uploadError: string | null;
}

function UploadButton({ onUpload, uploading, uploadError }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side validation before calling the service
      const isValidMime = ALLOWED_RECAP_MIME_PREFIXES.some((prefix) =>
        file.type.startsWith(prefix)
      );
      if (!isValidMime) {
        // Reset input so same file can be re-selected after fixing
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > MAX_RECAP_FILE_SIZE_BYTES) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      await onUpload(file);
      // Reset input after upload so the user can re-upload the same file if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onUpload]
  );

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleChange}
        className="hidden"
        id="recap-upload-input"
        disabled={uploading}
      />
      <label
        htmlFor="recap-upload-input"
        className={`flex items-center justify-center gap-2 h-[44px] rounded-full border transition-colors cursor-pointer font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-[0.12em] ${
          uploading
            ? "border-cave-ash/30 text-cave-ash cursor-not-allowed opacity-60"
            : "border-cave-smoke text-cave-light hover:bg-white/10 hover:text-cave-white"
        }`}
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-[#FFFFFF]/40 border-t-[#FFFFFF] rounded-full animate-spin" />
            Subiendo…
          </>
        ) : (
          <>
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Subir foto / video
          </>
        )}
      </label>
      {uploadError && (
        <p className="text-[10px] text-[#FF2D7B] font-[family-name:var(--font-space-mono)] text-center">
          {uploadError}
        </p>
      )}
      <p className="text-[9px] text-cave-ash font-[family-name:var(--font-space-mono)] text-center">
        Máx. {formatFileSize(MAX_RECAP_FILE_SIZE_BYTES)} · imágenes y videos
      </p>
    </div>
  );
}

// ─── RecapsGallery ────────────────────────────────────────────────────────────

export function RecapsGallery({ flyerId, isOwner = false }: RecapsGalleryProps) {
  const { user } = useAuth();
  const { media, loading, error, upload, remove } = useRecaps(flyerId);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ─── Upload ──────────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError(null);
      try {
        await upload(file);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Error al subir el archivo."
        );
      } finally {
        setUploading(false);
      }
    },
    [upload]
  );

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (mediaId: string) => {
      setDeletingIds((prev) => new Set(prev).add(mediaId));
      setDeleteError(null);
      try {
        await remove(mediaId);
        // If the lightbox is open on the deleted item, close it
        setLightboxIndex((prev) => {
          if (prev === null) return null;
          const newMedia = media.filter((m) => m.id !== mediaId);
          if (prev >= newMedia.length) return newMedia.length > 0 ? newMedia.length - 1 : null;
          return prev;
        });
      } catch (err) {
        setDeleteError(
          err instanceof Error ? err.message : "Error al eliminar."
        );
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });
      }
    },
    [remove, media]
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 border-2 border-cave-ash border-t-[#FFFFFF] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)] text-center py-4">
        Error al cargar los recaps
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Upload control — only for authenticated users */}
        {user && (
          <UploadButton
            onUpload={handleUpload}
            uploading={uploading}
            uploadError={uploadError}
          />
        )}

        {deleteError && (
          <p className="text-[10px] text-[#FF2D7B] font-[family-name:var(--font-space-mono)] text-center">
            {deleteError}
          </p>
        )}

        {/* Grid */}
        {media.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cave-ash"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="text-xs text-cave-ash font-[family-name:var(--font-space-mono)] text-center">
              Todavía no hay recaps de este evento
            </p>
            {user && (
              <p className="text-[10px] text-cave-ash/60 font-[family-name:var(--font-space-mono)] text-center">
                ¡Subí la primera foto o video!
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            <AnimatePresence>
              {media.map((item, i) => {
                // Delete permission: own uploads OR flyer owner
                const canDelete =
                  !!user &&
                  (isOwner || item.uploaded_by === user.id);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  >
                    <MediaThumbnail
                      item={item}
                      canDelete={canDelete}
                      onDelete={handleDelete}
                      onClick={() => setLightboxIndex(i)}
                      deleting={deletingIds.has(item.id)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Sign-in nudge for anonymous visitors */}
        {!user && media.length > 0 && (
          <p className="text-[10px] text-cave-ash font-[family-name:var(--font-space-mono)] text-center">
            <a href="/auth/login" className="underline hover:text-cave-fog transition-colors">
              Iniciá sesión
            </a>{" "}
            para subir tus fotos y videos
          </p>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && media.length > 0 && (
          <Lightbox
            items={media}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNav={setLightboxIndex}
          />
        )}
      </AnimatePresence>
    </>
  );
}
