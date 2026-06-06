import { createClient } from "@/shared/lib/supabase/client";

// ─── Constants ─────────────────────────────────────────────────────────────
const CHAT_MEDIA_BUCKET = "chat-media";
const MAX_CHAT_MEDIA_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
]);

// ─── Return type ───────────────────────────────────────────────────────────
export interface ChatMediaUploadResult {
  url: string;
  type: "image" | "audio";
  sizeBytes: number;
  durationSeconds?: number;
}

// ─── uploadChatMedia ───────────────────────────────────────────────────────
// 1. Validates mime type and size (≤10MB) BEFORE any network call (fail-fast).
//    image kind → must be image/*; audio kind → must be audio/*.
// 2. Authenticates the caller; uid goes FIRST in the storage path so the
//    storage RLS policy (foldername(name)[1] = auth.uid()) passes.
// 3. Uploads to `chat-media` bucket under `${uid}/${conversationId}/${uuid}.${ext}`.
// 4. Returns public URL, kind, and file size. durationSeconds is not derivable
//    from a File object — callers that know it should attach it to the message
//    insert via postMessage's media opts.
export async function uploadChatMedia(
  conversationId: string,
  file: File,
  kind: "image" | "audio"
): Promise<ChatMediaUploadResult> {
  // ── Validate mime BEFORE hitting the network ────────────────────────────
  const allowedMimes = kind === "image" ? ALLOWED_IMAGE_MIMES : ALLOWED_AUDIO_MIMES;

  if (!allowedMimes.has(file.type)) {
    throw new Error(
      kind === "image"
        ? `Tipo de archivo no permitido para imagen: ${file.type}. Permitidos: jpeg, png, webp.`
        : `Tipo de archivo no permitido para audio: ${file.type}. Permitidos: webm, mpeg, mp4, wav.`
    );
  }

  // ── Validate size BEFORE hitting the network ────────────────────────────
  if (file.size > MAX_CHAT_MEDIA_SIZE_BYTES) {
    throw new Error(
      `El archivo supera el límite de 10MB (tamaño: ${(file.size / 1024 / 1024).toFixed(1)}MB).`
    );
  }

  const supabase = createClient();

  // ── Authenticate ────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Tenés que iniciar sesión para subir archivos.");
  }

  // ── Build storage path: uid FIRST (RLS requires foldername(name)[1] = uid) ─
  const ext = getExtensionFromMime(file.type);
  const uuid = crypto.randomUUID();
  const storagePath = `${user.id}/${conversationId}/${uuid}${ext}`;

  // ── Upload ──────────────────────────────────────────────────────────────
  const { error: storageError } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(storagePath, file);

  if (storageError) {
    throw new Error(`Failed to upload chat media: ${storageError.message}`);
  }

  // ── Get public URL (sync — no network) ─────────────────────────────────
  const {
    data: { publicUrl },
  } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(storagePath);

  return {
    url: publicUrl,
    type: kind,
    sizeBytes: file.size,
    // durationSeconds is not available from the File API; callers who know it
    // (e.g. after recording) should pass it via postMessage's media opts.
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Maps a MIME type to a file extension. Defaults to empty string if unknown. */
function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "audio/webm": ".webm",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".mp4",
    "audio/wav": ".wav",
  };
  return map[mime] ?? "";
}
