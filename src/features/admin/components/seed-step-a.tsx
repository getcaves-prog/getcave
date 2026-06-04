"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/shared/lib/supabase/client";
import { createSeededCommunity } from "@/features/communities/services/seeding.service";
import type { Tables } from "@/shared/types/database.types";

type Community = Tables<"communities">;

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const COMMUNITIES_BUCKET = "communities";

const SOURCE_PLATFORMS = [
  { value: "Facebook", label: "Facebook" },
  { value: "Instagram", label: "Instagram" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Otro", label: "Otro" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Formato inválido. Aceptados: JPG, PNG, WebP";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `Archivo muy grande. Máx 5MB (tuyo: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  return null;
}

// ─── ImageUploadSlot ──────────────────────────────────────────────────────────

interface ImageUploadSlotProps {
  label: string;
  preview: string | null;
  error: string | null;
  aspectClass: string;
  onSelect: (file: File) => void;
  onClear: () => void;
}

function ImageUploadSlot({
  label,
  preview,
  error,
  aspectClass,
  onSelect,
  onClear,
}: ImageUploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
        {label}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
      {preview ? (
        <div className={`relative overflow-hidden rounded-xl ${aspectClass}`}>
          <Image src={preview} alt={label} fill className="object-cover" unoptimized />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-cave-black/70 text-cave-white transition-colors hover:bg-cave-black"
            aria-label={`Quitar ${label}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-cave-ash bg-cave-rock transition-colors hover:border-cave-fog ${aspectClass}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cave-smoke">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="font-[family-name:var(--font-space-mono)] text-[10px] text-cave-smoke">
            Subir {label.toLowerCase()}
          </span>
        </button>
      )}
      {error && (
        <p className="mt-1 font-[family-name:var(--font-space-mono)] text-xs text-neon-pink">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── SeedStepA ────────────────────────────────────────────────────────────────

interface SeedStepAProps {
  onSuccess: (community: Community) => void;
}

export function SeedStepA({ onSuccess }: SeedStepAProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  // Image state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auto-slug from name
  const handleNameChange = useCallback(
    (val: string) => {
      setName(val);
      setFieldErrors((prev) => ({ ...prev, name: "" }));
      if (!slugEdited) {
        setSlug(slugify(val));
      }
    },
    [slugEdited]
  );

  const handleImageSelect = useCallback(
    (slot: "cover" | "avatar") => (file: File) => {
      const err = validateImageFile(file);
      if (err) {
        if (slot === "cover") setCoverError(err);
        else setAvatarError(err);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = ev.target?.result as string;
        if (slot === "cover") {
          setCoverError(null);
          setCoverFile(file);
          setCoverPreview(preview);
        } else {
          setAvatarError(null);
          setAvatarFile(file);
          setAvatarPreview(preview);
        }
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const uploadImage = useCallback(
    async (file: File, slot: "cover" | "avatar", communityId: string): Promise<string> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const ext = file.type.split("/")[1] ?? "jpg";
      const uuid = crypto.randomUUID();
      const path = `${user.id}/${communityId}/${slot}-${uuid}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(COMMUNITIES_BUCKET)
        .upload(path, file, { contentType: file.type });

      if (uploadErr) throw new Error(`Error al subir ${slot}: ${uploadErr.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from(COMMUNITIES_BUCKET)
        .getPublicUrl(path);

      return publicUrl;
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "El nombre es requerido";
    if (!slug.trim()) errors.slug = "El slug es requerido";
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      errors.slug = "Solo minúsculas, números y guiones";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create community with no images first (we need the ID)
      const community = await createSeededCommunity({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        sourcePlatform: sourcePlatform || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
      });

      // Step 2: Upload images if provided, then update
      let coverUrl: string | undefined;
      let avatarUrl: string | undefined;

      if (coverFile) {
        coverUrl = await uploadImage(coverFile, "cover", community.id);
      }
      if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile, "avatar", community.id);
      }

      // Step 3: Update community with image URLs if any were uploaded
      if (coverUrl || avatarUrl) {
        const supabase = createClient();
        await supabase
          .from("communities")
          .update({
            ...(coverUrl && { cover_url: coverUrl }),
            ...(avatarUrl && { avatar_url: avatarUrl }),
          })
          .eq("id", community.id);

        // Return enriched community
        const { data: updated } = await supabase
          .from("communities")
          .select("*")
          .eq("id", community.id)
          .single();

        onSuccess((updated ?? community) as Community);
      } else {
        onSuccess(community);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error inesperado al crear la comunidad"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-cave-ash bg-cave-stone p-4 sm:p-6"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Left column */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
              Nombre <span className="text-neon-pink">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="p.ej. Cave Buenos Aires"
              maxLength={100}
              className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white placeholder-cave-smoke outline-none transition-colors focus:border-cave-fog"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-neon-pink">{fieldErrors.name}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
              Slug <span className="text-neon-pink">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setSlugEdited(true);
                setFieldErrors((prev) => ({ ...prev, slug: "" }));
              }}
              placeholder="cave-buenos-aires"
              maxLength={60}
              className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 font-[family-name:var(--font-space-mono)] text-sm text-cave-white placeholder-cave-smoke outline-none transition-colors focus:border-cave-fog"
            />
            <p className="mt-1 font-[family-name:var(--font-space-mono)] text-[10px] text-cave-smoke">
              /communities/{slug || "…"}
            </p>
            {fieldErrors.slug && (
              <p className="mt-1 text-xs text-neon-pink">{fieldErrors.slug}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
              Ciudad
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Buenos Aires"
              className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white placeholder-cave-smoke outline-none transition-colors focus:border-cave-fog"
            />
          </div>

          {/* Source platform */}
          <div>
            <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
              Plataforma origen
            </label>
            <select
              value={sourcePlatform}
              onChange={(e) => setSourcePlatform(e.target.value)}
              className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white outline-none transition-colors focus:border-cave-fog"
            >
              <option value="">Sin especificar</option>
              {SOURCE_PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Source URL */}
          <div>
            <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
              URL origen
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://facebook.com/groups/..."
              className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white placeholder-cave-smoke outline-none transition-colors focus:border-cave-fog"
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Description */}
          <div>
            <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué trata esta comunidad?"
              maxLength={500}
              rows={3}
              className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white placeholder-cave-smoke outline-none transition-colors focus:border-cave-fog resize-none"
            />
            <p className="mt-1 text-right font-[family-name:var(--font-space-mono)] text-[10px] text-cave-smoke">
              {description.length}/500
            </p>
          </div>

          {/* Cover image */}
          <ImageUploadSlot
            label="Portada"
            preview={coverPreview}
            error={coverError}
            aspectClass="h-28"
            onSelect={handleImageSelect("cover")}
            onClear={() => {
              setCoverFile(null);
              setCoverPreview(null);
              setCoverError(null);
            }}
          />

          {/* Avatar image */}
          <ImageUploadSlot
            label="Avatar"
            preview={avatarPreview}
            error={avatarError}
            aspectClass="h-20"
            onSelect={handleImageSelect("avatar")}
            onClear={() => {
              setAvatarFile(null);
              setAvatarPreview(null);
              setAvatarError(null);
            }}
          />
        </div>
      </div>

      {/* Global error */}
      {error && (
        <p className="mt-4 rounded-lg border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-[44px] rounded-full bg-cave-white px-6 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-cave-black transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {submitting ? "Creando…" : "Crear comunidad"}
        </button>
        {submitting && (
          <span className="text-xs text-cave-fog">
            Esto puede tardar unos segundos…
          </span>
        )}
      </div>
    </form>
  );
}
