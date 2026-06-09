import { createClient } from "@/shared/lib/supabase/client";
import type { EventMedia, MyRecap } from "../types/recaps.types";
import { MAX_RECAP_FILE_SIZE_BYTES } from "../types/recaps.types";

// ─── listCommunityRecaps ───────────────────────────────────────────────────
// Returns the most recent event_media items across all flyers that belong to
// the given community. Two-query approach:
//   1. Fetch flyer ids for the community.
//   2. Fetch event_media where flyer_id IN (...), ordered newest-first.
// DECISION: two queries over a server-side JOIN keeps this in the type-safe
// supabase-js API and matches the codebase pattern used in getPollResults.
// Returns an empty array if the community has no flyers.
export async function listCommunityRecaps(
  communityId: string,
  limit: number = 12
): Promise<EventMedia[]> {
  const supabase = createClient();

  // Step 1: get flyer ids for this community
  const { data: flyerRows, error: flyerError } = await supabase
    .from("flyers")
    .select("id")
    .eq("community_id", communityId);

  if (flyerError) {
    throw new Error(`Failed to get community flyers: ${flyerError.message}`);
  }

  const flyerIds = (flyerRows ?? []).map((f) => f.id);
  if (flyerIds.length === 0) return [];

  // Step 2: fetch event_media for those flyers
  const { data, error } = await supabase
    .from("event_media")
    .select("*")
    .in("flyer_id", flyerIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get community recaps: ${error.message}`);
  }

  return (data ?? []) as EventMedia[];
}

// ─── listMyRecaps ─────────────────────────────────────────────────────────
// Returns event_media items from events the user attended, enriched with
// flyer title, event_date, and community name. Four-query approach:
//   Q1: event_attendance WHERE user_id = userId → distinct flyer_id[].
//   Q2: event_media WHERE flyer_id IN (...) ORDER BY created_at DESC LIMIT N.
//   Q3: batch-fetch flyers (id, title, event_date, community_id).
//   Q4: batch-fetch communities (id, name) for distinct non-null community_ids.
// Returns [] when the user has no attendance or no media exists.
// DECISION: separate queries over server-side JOINs keeps this in the
// type-safe supabase-js API and matches the established codebase pattern.
export async function listMyRecaps(
  userId: string,
  limit: number = 12
): Promise<MyRecap[]> {
  const supabase = createClient();

  // Q1: flyer_ids the user attended
  const { data: attendanceRows, error: attendanceError } = await supabase
    .from("event_attendance")
    .select("flyer_id")
    .eq("user_id", userId);

  if (attendanceError) {
    throw new Error(`Failed to get my recaps: ${attendanceError.message}`);
  }

  const rows = attendanceRows ?? [];
  if (rows.length === 0) return [];

  const flyerIds = [...new Set(rows.map((r) => r.flyer_id))];

  // Q2: event_media for those flyers, newest-first, limited
  const { data: mediaRows, error: mediaError } = await supabase
    .from("event_media")
    .select("id, flyer_id, media_url, thumbnail_url, media_type, created_at")
    .in("flyer_id", flyerIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (mediaError) {
    throw new Error(`Failed to get my recaps: ${mediaError.message}`);
  }

  const media = mediaRows ?? [];
  if (media.length === 0) return [];

  // Q3: batch-fetch flyer metadata (title, event_date, community_id)
  const mediaFlyerIds = [...new Set(media.map((m) => m.flyer_id))];

  const { data: flyerRows } = await supabase
    .from("flyers")
    .select("id, title, event_date, community_id")
    .in("id", mediaFlyerIds);

  const flyerMap = new Map<string, {
    title: string | null;
    event_date: string | null;
    community_id: string | null;
  }>();

  if (flyerRows) {
    for (const f of flyerRows) {
      flyerMap.set(f.id, {
        title: f.title,
        event_date: f.event_date,
        community_id: f.community_id,
      });
    }
  }

  // Q4: batch-fetch communities for distinct non-null community_ids
  const communityIds = [
    ...new Set(
      Array.from(flyerMap.values())
        .map((f) => f.community_id)
        .filter((id): id is string => id !== null)
    ),
  ];

  const communityMap = new Map<string, string>(); // id → name

  if (communityIds.length > 0) {
    const { data: communities } = await supabase
      .from("communities")
      .select("id, name")
      .in("id", communityIds);

    if (communities) {
      for (const c of communities) {
        communityMap.set(c.id, c.name);
      }
    }
  }

  // Map into MyRecap shape
  return media.map((m): MyRecap => {
    const flyer = flyerMap.get(m.flyer_id);
    const communityName = flyer?.community_id
      ? (communityMap.get(flyer.community_id) ?? null)
      : null;

    return {
      id: m.id,
      media_url: m.media_url,
      thumbnail_url: m.thumbnail_url,
      media_type: m.media_type,
      flyer_id: m.flyer_id,
      flyer_title: flyer?.title ?? null,
      event_date: flyer?.event_date ?? null,
      community_name: communityName,
    };
  });
}

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
// Deletes the event_media row AND the corresponding file in the `recaps` bucket.
// RLS enforces: uploaded_by = auth.uid() OR flyer.user_id = auth.uid().
//
// DECISION: fetch the row first to extract the storage path from media_url,
// then delete DB row, then remove storage object.
// Order: DB first — the user-visible delete succeeds even if storage removal
// fails (no user-facing error on orphaned file; logged only).
// Storage path is extracted from the public URL pattern:
//   …/storage/v1/object/public/recaps/<path>
// Everything after "/recaps/" is the object path inside the bucket.
export async function deleteRecapMedia(mediaId: string): Promise<void> {
  const supabase = createClient();

  // Step 1: fetch the row to get the media_url (need it for storage path)
  const { data: row, error: fetchError } = await supabase
    .from("event_media")
    .select("id, media_url")
    .eq("id", mediaId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to delete media: ${fetchError.message}`);
  }

  // Step 2: delete DB row
  const { error: deleteError } = await supabase
    .from("event_media")
    .delete()
    .eq("id", mediaId);

  if (deleteError) {
    throw new Error(`Failed to delete media: ${deleteError.message}`);
  }

  // Step 3: remove storage object (best-effort — don't throw on failure)
  if (row?.media_url) {
    const storagePath = extractStoragePath(row.media_url);
    if (storagePath) {
      // Ignore errors — missing file or permission issue should not surface to user
      await supabase.storage.from("recaps").remove([storagePath]);
    }
  }
}

// ─── extractStoragePath ────────────────────────────────────────────────────
// Extracts the storage object path from a Supabase public URL.
// Input:  "https://…/storage/v1/object/public/recaps/user-id/flyer-id/uuid.jpg"
// Output: "user-id/flyer-id/uuid.jpg"
// Returns null if the URL doesn't match the expected pattern (defensive).
function extractStoragePath(publicUrl: string): string | null {
  const marker = "/storage/v1/object/public/recaps/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = publicUrl.slice(idx + marker.length);
  return path.length > 0 ? path : null;
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
