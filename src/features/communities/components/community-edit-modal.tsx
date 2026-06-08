"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/client";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { updateCommunity } from "../services/community.service";
import type { Community } from "../types/community.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const COMMUNITIES_BUCKET = "communities";

// ─── Validation ───────────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre no puede estar vacío")
    .max(100, "El nombre no puede superar 100 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede superar 500 caracteres")
    .optional(),
});

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Formato inválido. Aceptados: JPG, PNG, WebP";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Archivo muy grande. Máx 5MB (tuyo: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CommunityEditModalProps {
  community: Community;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── CommunityEditModal ───────────────────────────────────────────────────────

export function CommunityEditModal({
  community,
  onClose,
  onSuccess,
}: CommunityEditModalProps) {
  const { user } = useAuth();

  // ── Text fields ─────────────────────────────────────────────────────────────
  const [name, setName] = useState(community.name ?? "");
  const [description, setDescription] = useState(community.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Cover ───────────────────────────────────────────────────────────────────
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ── Save state ──────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Image selection handlers ─────────────────────────────────────────────────

  const handleAvatarSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validationError = validateImageFile(file);
      if (validationError) {
        setAvatarError(validationError);
        return;
      }

      setAvatarError(null);
      setAvatarFile(file);

      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatarPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Reset so same file can be re-selected if user clears and re-picks
      e.target.value = "";
    },
    []
  );

  const handleCoverSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validationError = validateImageFile(file);
      if (validationError) {
        setCoverError(validationError);
        return;
      }

      setCoverError(null);
      setCoverFile(file);

      const reader = new FileReader();
      reader.onload = (ev) => {
        setCoverPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);

      e.target.value = "";
    },
    []
  );

  // ── Upload helper ────────────────────────────────────────────────────────────
  // Path: {userId}/{communityId}/<cover|avatar>-<uuid>.<ext>
  // uid-first so the RLS storage policy (uid-first-folder) passes.

  const uploadImage = useCallback(
    async (
      file: File,
      slot: "avatar" | "cover"
    ): Promise<string> => {
      if (!user) throw new Error("No autenticado");

      const ext = file.type.split("/")[1] ?? "jpg";
      const uuid = crypto.randomUUID();
      const path = `${user.id}/${community.id}/${slot}-${uuid}.${ext}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(COMMUNITIES_BUCKET)
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        throw new Error(`Error al subir ${slot}: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(COMMUNITIES_BUCKET).getPublicUrl(path);

      return publicUrl;
    },
    [user, community.id]
  );

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaveError(null);

    // Validate text fields
    const validation = editSchema.safeParse({
      name,
      description: description || undefined,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const key = String(issue.path[0]);
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      setSaveError("No autenticado");
      return;
    }

    setSaving(true);

    try {
      let newAvatarUrl: string | undefined;
      let newCoverUrl: string | undefined;

      // Upload only if a new file was selected (no double-upload guard)
      if (avatarFile) {
        newAvatarUrl = await uploadImage(avatarFile, "avatar");
      }

      if (coverFile) {
        newCoverUrl = await uploadImage(coverFile, "cover");
      }

      await updateCommunity(community.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        ...(newAvatarUrl !== undefined && { avatarUrl: newAvatarUrl }),
        ...(newCoverUrl !== undefined && { coverUrl: newCoverUrl }),
      });

      onSuccess();
      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Error inesperado al guardar"
      );
    } finally {
      setSaving(false);
    }
  }, [
    name,
    description,
    avatarFile,
    coverFile,
    user,
    community.id,
    uploadImage,
    onSuccess,
    onClose,
  ]);

  // ── Derived display values ────────────────────────────────────────────────────

  const displayAvatar = avatarPreview ?? community.avatar_url ?? null;
  const displayCover = coverPreview ?? community.cover_url ?? null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-cave-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Editar comunidad"
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative pointer-events-auto w-full max-w-[420px] max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-cave-rock border border-cave-ash p-5 scrollbar-hide"
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg text-cave-white font-[family-name:var(--font-space-mono)]">
              Editar comunidad
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-cave-fog hover:text-cave-white transition-colors"
              aria-label="Cerrar"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── Cover banner upload ─────────────────────────────────────────── */}
          <div className="mb-5">
            <SectionHeading>Portada</SectionHeading>
            <input
              ref={coverInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleCoverSelect}
              className="hidden"
              aria-label="Seleccionar imagen de portada"
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="relative w-full h-28 rounded-xl overflow-hidden bg-cave-stone border border-cave-ash hover:border-cave-fog transition-colors group"
              aria-label="Cambiar portada"
            >
              {displayCover ? (
                <Image
                  src={displayCover}
                  alt="Portada"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
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
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-cave-smoke font-[family-name:var(--font-space-mono)]">
                    Subir portada
                  </span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-cave-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-cave-white"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </button>
            {coverError && (
              <p className="mt-1 text-xs text-neon-pink">{coverError}</p>
            )}
          </div>

          {/* ── Avatar upload ───────────────────────────────────────────────── */}
          <div className="mb-5">
            <SectionHeading>Avatar</SectionHeading>
            <input
              ref={avatarInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleAvatarSelect}
              className="hidden"
              aria-label="Seleccionar avatar"
            />
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-cave-ash hover:border-cave-fog transition-colors group flex-shrink-0"
                aria-label="Cambiar avatar"
              >
                {displayAvatar ? (
                  <Image
                    src={displayAvatar}
                    alt="Avatar"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-cave-stone flex items-center justify-center">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-cave-smoke"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-cave-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-cave-white"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              </button>

              <p className="text-xs text-cave-smoke font-[family-name:var(--font-inter)] leading-5">
                JPG, PNG o WebP · máx 5MB
              </p>
            </div>
            {avatarError && (
              <p className="mt-1 text-xs text-neon-pink">{avatarError}</p>
            )}
          </div>

          {/* ── Name ───────────────────────────────────────────────────────── */}
          <div className="mb-4">
            <Input
              label="Nombre"
              placeholder="Nombre de la comunidad"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
              error={errors.name}
              maxLength={100}
            />
          </div>

          {/* ── Description ────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5 mb-6">
            <label className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)]">
              Descripción (opcional)
            </label>
            <textarea
              placeholder="¿De qué trata esta comunidad?"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((prev) => ({ ...prev, description: "" }));
              }}
              maxLength={500}
              rows={3}
              className="w-full rounded-xl bg-cave-ash px-4 py-3 text-cave-light placeholder:text-cave-smoke border border-cave-rock focus:border-[#FFFFFF] focus:ring-2 focus:ring-[#FFFFFF]/20 focus:outline-none transition-colors resize-none"
            />
            <div className="flex justify-between items-center">
              {errors.description && (
                <p className="text-xs text-neon-pink">{errors.description}</p>
              )}
              <p className="text-xs text-cave-smoke ml-auto">
                {description.length}/500
              </p>
            </div>
          </div>

          {/* ── Save error ─────────────────────────────────────────────────── */}
          {saveError && (
            <p className="text-xs text-neon-pink mb-4">{saveError}</p>
          )}

          {/* ── Actions ────────────────────────────────────────────────────── */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-full border border-cave-ash text-cave-smoke hover:text-cave-white hover:border-cave-fog bg-transparent disabled:opacity-40 transition-colors"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-full bg-cave-white text-cave-black hover:bg-cave-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
