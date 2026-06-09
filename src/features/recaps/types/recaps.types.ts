import type { Tables } from "@/shared/types/database.types";

// ─── Raw DB row alias ───────────────────────────────────────────────────────
export type EventMedia = Tables<"event_media">;

// ─── Upload input ───────────────────────────────────────────────────────────
export interface UploadRecapInput {
  flyerId: string;
  file: File;
}

// ─── Validation constants ───────────────────────────────────────────────────
export const MAX_RECAP_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_RECAP_MIME_PREFIXES = ["image/", "video/"] as const;

// ─── MyRecap ────────────────────────────────────────────────────────────────
/**
 * A single event_media item from an event the current user attended.
 * Enriched with flyer title, event_date, and community name for display.
 */
export interface MyRecap {
  id: string;
  media_url: string;
  thumbnail_url: string | null;
  media_type: string;
  flyer_id: string;
  flyer_title: string | null;
  event_date: string | null;
  community_name: string | null;
}
