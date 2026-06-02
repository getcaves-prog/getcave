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
