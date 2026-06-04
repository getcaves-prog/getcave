"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { createFlyer } from "@/features/admin/services/admin.service";
import { uploadRecapMedia } from "@/features/recaps/services/recaps.service";
import type { Tables } from "@/shared/types/database.types";

type Community = Tables<"communities">;
type Flyer = Tables<"flyers">;

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Formato inválido. Aceptados: JPG, PNG, WebP, GIF, HEIC";
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Archivo muy grande. Máx 10MB (tuyo: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  return null;
}

async function uploadFlyerImage(file: File): Promise<string> {
  const supabase = createClient();
  const fileName = `${Date.now()}-seed-${crypto.randomUUID().slice(0, 8)}.${file.type.split("/")[1] ?? "jpg"}`;

  const { error: uploadError } = await supabase.storage
    .from("flyers")
    .upload(fileName, file, { contentType: file.type });

  if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from("flyers").getPublicUrl(fileName);
  return publicUrl;
}

// ─── EventForm ────────────────────────────────────────────────────────────────

interface EventFormProps {
  communityId: string;
  onCreated: (flyer: { id: string; title: string; event_date: string | null }) => void;
}

function EventForm({ communityId, onCreated }: EventFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    const err = validateImageFile(file);
    if (err) {
      setImageError(err);
      return;
    }
    setImageError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!imageFile) errors.image = "La imagen es requerida";
    if (!title.trim()) errors.title = "El título es requerido";
    if (!address.trim()) errors.address = "La dirección es requerida";
    if (!eventDate) errors.eventDate = "La fecha es requerida";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const imageUrl = await uploadFlyerImage(imageFile!);

      await createFlyer({
        image_url: imageUrl,
        title: title.trim(),
        address: address.trim(),
        status: "approved",
        community_id: communityId,
        event_date: eventDate,
        event_time: eventTime || undefined,
      });

      // Fetch the newly created flyer to get its ID
      const supabase = createClient();
      const { data: flyers } = await supabase
        .from("flyers")
        .select("id, title, event_date")
        .eq("community_id", communityId)
        .eq("title", title.trim())
        .order("created_at", { ascending: false })
        .limit(1);

      const newFlyer = flyers?.[0];
      if (newFlyer) {
        onCreated({
          id: newFlyer.id,
          title: newFlyer.title ?? title.trim(),
          event_date: newFlyer.event_date,
        });
      }

      // Reset form
      setImageFile(null);
      setImagePreview(null);
      setTitle("");
      setAddress("");
      setEventDate("");
      setEventTime("");
      setFieldErrors({});
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al crear el evento");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-cave-ash bg-cave-stone p-4 sm:p-6"
    >
      <h3 className="mb-4 font-[family-name:var(--font-space-mono)] text-sm text-cave-white">
        Agregar evento
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Left: image */}
        <div>
          <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
            Imagen <span className="text-neon-pink">*</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.heic"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className="hidden"
          />

          {imagePreview ? (
            <div className="relative h-40 overflow-hidden rounded-xl">
              <img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-cave-black/70 text-cave-white hover:bg-cave-black"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cave-ash bg-cave-rock transition-colors hover:border-cave-fog"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cave-fog">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                Subir flyer
              </span>
            </button>
          )}
          {imageError && (
            <p className="mt-1 text-xs text-neon-pink">{imageError}</p>
          )}
          {fieldErrors.image && (
            <p className="mt-1 text-xs text-neon-pink">{fieldErrors.image}</p>
          )}
        </div>

        {/* Right: fields */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
              Título <span className="text-neon-pink">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFieldErrors((p) => ({ ...p, title: "" }));
              }}
              placeholder="Nombre del evento"
              maxLength={100}
              className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white placeholder-cave-smoke outline-none focus:border-cave-fog"
            />
            {fieldErrors.title && <p className="mt-1 text-xs text-neon-pink">{fieldErrors.title}</p>}
          </div>

          <div>
            <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
              Dirección <span className="text-neon-pink">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setFieldErrors((p) => ({ ...p, address: "" }));
              }}
              placeholder="Dirección del venue"
              className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white placeholder-cave-smoke outline-none focus:border-cave-fog"
            />
            {fieldErrors.address && <p className="mt-1 text-xs text-neon-pink">{fieldErrors.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                Fecha <span className="text-neon-pink">*</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => {
                  setEventDate(e.target.value);
                  setFieldErrors((p) => ({ ...p, eventDate: "" }));
                }}
                className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white outline-none focus:border-cave-fog"
              />
              {fieldErrors.eventDate && <p className="mt-1 text-xs text-neon-pink">{fieldErrors.eventDate}</p>}
            </div>

            <div>
              <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                Hora
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white outline-none focus:border-cave-fog"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">
          {error}
        </p>
      )}

      <div className="mt-4">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-[44px] rounded-full bg-cave-white px-5 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-cave-black transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {submitting ? "Creando…" : "Agregar evento"}
        </button>
      </div>
    </form>
  );
}

// ─── RecapUpload ──────────────────────────────────────────────────────────────

interface RecapUploadProps {
  flyerId: string;
  flyerTitle: string;
}

function RecapUpload({ flyerId, flyerTitle }: RecapUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadRecapMedia(flyerId, file);
      setSuccess(true);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir recap");
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <span className="text-xs text-cave-fog">
        Recap subido para <span className="text-cave-white">{flyerTitle}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
        }}
      />
      {file ? (
        <span className="text-xs text-cave-fog">{file.name}</span>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-xs text-cave-fog underline underline-offset-2 transition-colors hover:text-cave-white"
        >
          Subir recap
        </button>
      )}
      {file && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="rounded-lg border border-cave-ash bg-cave-rock px-3 py-1 font-[family-name:var(--font-space-mono)] text-xs text-cave-white transition-colors hover:border-cave-fog disabled:opacity-50"
        >
          {uploading ? "Subiendo…" : "Confirmar"}
        </button>
      )}
      {error && <span className="text-xs text-neon-pink">{error}</span>}
    </div>
  );
}

// ─── SeedStepB ────────────────────────────────────────────────────────────────

interface SeedStepBProps {
  community: Community;
  onContinue: () => void;
}

export function SeedStepB({ community, onContinue }: SeedStepBProps) {
  const [createdFlyers, setCreatedFlyers] = useState<
    Array<{ id: string; title: string; event_date: string | null }>
  >([]);

  return (
    <div className="space-y-6">
      <EventForm
        communityId={community.id}
        onCreated={(flyer) => setCreatedFlyers((prev) => [flyer, ...prev])}
      />

      {/* List of created flyers */}
      {createdFlyers.length > 0 && (
        <div className="rounded-xl border border-cave-ash bg-cave-stone p-4">
          <p className="mb-3 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog uppercase tracking-wider">
            Eventos agregados ({createdFlyers.length})
          </p>
          <ul className="space-y-3">
            {createdFlyers.map((flyer) => (
              <li
                key={flyer.id}
                className="flex flex-col gap-2 rounded-lg border border-cave-ash bg-cave-rock p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-cave-white">{flyer.title}</span>
                  {flyer.event_date && (
                    <span className="shrink-0 font-[family-name:var(--font-space-mono)] text-[10px] text-cave-smoke">
                      {new Date(flyer.event_date + "T00:00:00").toLocaleDateString("es-AR")}
                    </span>
                  )}
                </div>
                {/* Recap upload for past events */}
                {flyer.event_date &&
                  new Date(flyer.event_date + "T00:00:00") < new Date() && (
                    <RecapUpload flyerId={flyer.id} flyerTitle={flyer.title} />
                  )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Continue */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-cave-fog">
          {createdFlyers.length === 0
            ? "Agregá al menos un evento, o saltá este paso."
            : `${createdFlyers.length} evento${createdFlyers.length > 1 ? "s" : ""} agregado${createdFlyers.length > 1 ? "s" : ""}.`}
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="min-h-[44px] rounded-full bg-cave-white px-5 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-cave-black transition-opacity hover:opacity-80"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
