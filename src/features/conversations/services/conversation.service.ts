import { createClient } from "@/shared/lib/supabase/client";
import type { Tables } from "@/shared/types/database.types";
import type {
  Conversation,
  MessageWithAuthor,
  SubjectType,
  ThreadedMessage,
} from "../types/conversation.types";
import { ReplyDepthError } from "../types/conversation.types";

export type { Conversation, MessageWithAuthor, ThreadedMessage };

// ─── getOrCreateConversation ───────────────────────────────────────────────
// Calls the SECURITY DEFINER RPC which validates the subject exists and
// creates the conversation row if it doesn't yet exist (idempotent).
export async function getOrCreateConversation(
  subjectType: SubjectType,
  subjectId: string
): Promise<Conversation> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_subject_type: subjectType,
    p_subject_id: subjectId,
  });

  if (error) {
    throw new Error(`Failed to get or create conversation: ${error.message}`);
  }

  return data as Conversation;
}

// ─── listMessages ──────────────────────────────────────────────────────────
// Returns ALL messages (including soft-deleted) ordered by created_at asc.
// Soft-deleted rows have body === null and is_deleted === true so the UI
// can render "mensaje eliminado" without leaking the original content.
//
// DECISION: messages.author_id → auth.users(id); profiles.id = auth.users.id
// but there is no FK from messages → profiles in the generated types, so
// supabase-js cannot auto-join profiles via the select() shorthand.
// Strategy: 2-query approach — fetch messages flat, then batch-fetch the
// unique profiles. This keeps N=2 queries regardless of message count and
// is correct even with 200 messages (unique authors << 200 in a thread).
// TODO: if a direct FK messages.author_id → profiles(id) is added in the DB,
// switch back to the single-select join for one round-trip.
//
// Limit: 200 (MVP — no pagination yet; TODO add cursor-based pagination)
export async function listMessages(
  conversationId: string
): Promise<MessageWithAuthor[]> {
  const supabase = createClient();

  // Query 1: messages (flat, no join)
  const { data: rows, error } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, parent_message_id, body, is_deleted, created_at, updated_at, author_id"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    throw new Error(`Failed to list messages: ${error.message}`);
  }

  const messageRows = (rows ?? []) as Tables<"messages">[];

  // Query 2: batch-fetch profiles for all unique non-null author_ids
  const authorIds = [
    ...new Set(
      messageRows.map((r) => r.author_id).filter((id): id is string => id !== null)
    ),
  ];

  const profileMap = new Map<
    string,
    { id: string; username: string; avatar_url: string | null }
  >();

  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", authorIds);

    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.id, p);
      }
    }
  }

  return mapMessages(messageRows, profileMap);
}

function mapMessages(
  rows: Tables<"messages">[],
  profileMap: Map<string, { id: string; username: string; avatar_url: string | null }>
): MessageWithAuthor[] {
  return rows.map((row) => {
    const profile = row.author_id ? (profileMap.get(row.author_id) ?? null) : null;
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      parent_message_id: row.parent_message_id,
      // Null out body for soft-deleted messages so the UI can show placeholder
      body: row.is_deleted ? null : row.body,
      is_deleted: row.is_deleted,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: profile
        ? {
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
          }
        : null,
    };
  });
}

// ─── postMessage ───────────────────────────────────────────────────────────
// Validates body client-side before hitting the network (fail fast).
// Maps the Postgres trigger error 'replies_limited_to_one_level' to a
// typed ReplyDepthError so callers can handle it specifically.
export async function postMessage(
  conversationId: string,
  body: string,
  parentMessageId?: string
): Promise<Tables<"messages">> {
  const trimmed = body.trim();

  if (trimmed.length === 0) {
    throw new Error("El mensaje no puede estar vacío.");
  }

  if (trimmed.length > 2000) {
    throw new Error("El mensaje no puede superar los 2000 caracteres.");
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      body: trimmed,
      parent_message_id: parentMessageId,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("replies_limited_to_one_level")) {
      throw new ReplyDepthError();
    }
    throw new Error(`Failed to post message: ${error.message}`);
  }

  return data;
}

// ─── softDeleteMessage ─────────────────────────────────────────────────────
// Sets is_deleted=true. Body is NOT cleared in the DB — the mapper in
// listMessages nulls it out for the client. This way moderation RPCs can
// still inspect original content later if needed.
export async function softDeleteMessage(messageId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("messages")
    .update({ is_deleted: true })
    .eq("id", messageId);

  if (error) {
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

// ─── groupByThread (pure helper — no network) ─────────────────────────────
// Takes a flat list of MessageWithAuthor (from listMessages) and returns
// a one-level-deep nested structure. Orphan replies (parent not present
// in the list) are surfaced at root level to avoid silently dropping them.
// DECISION: flat list + this helper gives the UI full flexibility:
// - Render flat → pass messages as-is
// - Render threaded → call groupByThread first
export function groupByThread(
  messages: MessageWithAuthor[]
): ThreadedMessage[] {
  const rootMessages: ThreadedMessage[] = [];
  const replyMap = new Map<string, MessageWithAuthor[]>();

  // First pass: collect replies by parent id
  for (const msg of messages) {
    if (msg.parent_message_id !== null) {
      const existing = replyMap.get(msg.parent_message_id) ?? [];
      replyMap.set(msg.parent_message_id, [...existing, msg]);
    }
  }

  // Second pass: build root messages with nested replies
  for (const msg of messages) {
    if (msg.parent_message_id === null) {
      rootMessages.push({ ...msg, replies: replyMap.get(msg.id) ?? [] });
    } else if (!messages.some((m) => m.id === msg.parent_message_id)) {
      // Orphan: parent not in the list → surface at root
      rootMessages.push({ ...msg, replies: [] });
    }
  }

  return rootMessages;
}
