import { createClient } from "@/shared/lib/supabase/client";
import type { EventMedia } from "../types/recaps.types";
import { MAX_RECAP_FILE_SIZE_BYTES } from "../types/recaps.types";

// ─── listEventMedia ────────────────────────────────────────────────────────
// Returns all media for a flyer, newest first. Public read — no auth required.
export async function listEventMedia(flyerId: string): Promise<EventMedia[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("event_media")
    .select("*")
    .eq("flyer_id", flyerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list event media: ${error.message}`);
  }

  return (data ?? []) as EventMedia[];
}

// ─── uploadRecapMedia ──────────────────────────────────────────────────────
// 1. Validates mime type (image/* or video/*) and size (≤ 10MB) client-side.
// 2. Uploads to the `recaps` storage bucket under path `{uid}/{flyerId}/{uuid}.{ext}`.
//    DECISION: uid must be the FIRST path segment because storage RLS policy
//    uses `(storage.foldername(name))[1] = auth.uid()` (1-indexed in Postgres).
//    This enforces that only the uploader can manage their own files.
// 3. Gets the public URL from the bucket.
// 4. Inserts the event_media row.
export async function uploadRecapMedia(
  flyerId: string,
  file: File
): Promise<EventMedia> {
  // Validate mime type before any network call
  const isValidMime =
    file.type.startsWith("image/") || file.type.startsWith("video/");

  if (!isValidMime) {
    throw new Error(
      "Solo se permiten archivos de imagen o video."
    );
  }

  // Validate file size
  if (file.size > MAX_RECAP_FILE_SIZE_BYTES) {
    throw new Error(
      "El archivo supera el límite de 10MB."
    );
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Tenés que iniciar sesión para subir media.");
  }

  // Derive extension from mime type (e.g. image/jpeg → .jpg)
  const ext = getExtensionFromMime(file.type);
  const uuid = crypto.randomUUID();
  const storagePath = `${user.id}/${flyerId}/${uuid}${ext}`;

  // Upload to storage
  const { error: storageError } = await supabase.storage
    .from("recaps")
    .upload(storagePath, file);

  if (storageError) {
    throw new Error(`Failed to upload media: ${storageError.message}`);
  }

  // Get public URL (sync — no network call)
  const {
    data: { publicUrl },
  } = supabase.storage.from("recaps").getPublicUrl(storagePath);

  // Determine media_type for the DB row
  const mediaType: "image" | "video" = file.type.startsWith("image/")
    ? "image"
    : "video";

  // Insert event_media row
  const { data, error: dbError } = await supabase
    .from("event_media")
    .insert({
      flyer_id: flyerId,
      uploaded_by: user.id,
      media_url: publicUrl,
      media_type: mediaType,
      thumbnail_url: null,
    })
    .select()
    .single();

  if (dbError) {
    throw new Error(`Failed to save media record: ${dbError.message}`);
  }

  return data as EventMedia;
}

// ─── deleteRecapMedia ──────────────────────────────────────────────────────
// Deletes the event_media row by id.
// RLS enforces: uploaded_by = auth.uid() OR flyer.user_id = auth.uid().
// DECISION: storage file is NOT deleted here for MVP — storage cleanup can
// be handled by a background job or Supabase Storage lifecycle rule. The
// public URL becomes orphaned but does not expose sensitive data.
export async function deleteRecapMedia(mediaId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("event_media")
    .delete()
    .eq("id", mediaId);

  if (error) {
    throw new Error(`Failed to delete media: ${error.message}`);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Maps a MIME type to a file extension. Defaults to empty string if unknown. */
function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "video/mpeg": ".mpeg",
    "video/x-msvideo": ".avi",
  };
  return map[mime] ?? "";
}
