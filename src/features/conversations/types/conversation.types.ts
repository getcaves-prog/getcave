import type { Tables } from "@/shared/types/database.types";

// ─── Raw DB types ──────────────────────────────────────────────────────────
export type Conversation = Tables<"conversations">;
export type MessageRow = Tables<"messages">;

// ─── Subject type (polymorphic key) ────────────────────────────────────────
export type SubjectType = "flyer" | "community" | "channel";

// ─── Author summary joined from profiles ───────────────────────────────────
export interface MessageAuthor {
  id: string;
  username: string;
  avatar_url: string | null;
}

// ─── Message shape returned by listMessages ────────────────────────────────
// Flat structure. Soft-deleted rows are included but body is null and
// is_deleted is true so the UI can render "mensaje eliminado".
export interface MessageWithAuthor {
  id: string;
  conversation_id: string;
  parent_message_id: string | null;
  body: string | null; // null when is_deleted === true
  is_deleted: boolean;
  is_official: boolean; // true = CAVES-authored seeded message
  created_at: string;
  updated_at: string;
  author: MessageAuthor | null; // null when author was deleted from auth.users
}

// ─── Nested thread helper ──────────────────────────────────────────────────
export interface ThreadedMessage extends MessageWithAuthor {
  replies: MessageWithAuthor[];
}

// ─── Typed error for trigger constraint ────────────────────────────────────
export class ReplyDepthError extends Error {
  readonly code = "replies_limited_to_one_level" as const;
  constructor() {
    super(
      "No se pueden hacer respuestas a respuestas. Máximo un nivel de anidación."
    );
    this.name = "ReplyDepthError";
  }
}
