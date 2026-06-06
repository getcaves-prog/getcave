"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getOrCreateConversation,
  listMessages,
  postMessage,
  softDeleteMessage,
} from "../services/conversation.service";
import { uploadChatMedia } from "../services/chat-media.service";
import type { Conversation, MessageWithAuthor } from "../types/conversation.types";
import type { SubjectType } from "../types/conversation.types";
import type { Tables } from "@/shared/types/database.types";

interface UseConversationState {
  conversation: Conversation | null;
  messages: MessageWithAuthor[];
  loading: boolean;
  error: Error | null;
}

interface UseConversationActions {
  post: (body: string) => Promise<Tables<"messages">>;
  reply: (body: string, parentMessageId: string) => Promise<Tables<"messages">>;
  remove: (messageId: string) => Promise<void>;
  refresh: () => Promise<void>;
  /**
   * Uploads a media file then posts it as a message (with optional text body).
   * For audio, pass durationSeconds so it's stored on the message row.
   */
  postMedia: (
    file: File | Blob,
    kind: "image" | "audio",
    opts?: { body?: string; durationSeconds?: number }
  ) => Promise<Tables<"messages">>;
}

export type UseConversationResult = UseConversationState & UseConversationActions;

// ─── useConversation ───────────────────────────────────────────────────────
// Lazily gets-or-creates the conversation on mount, then loads messages.
// Exposes post/reply/remove/refresh so the UI doesn't touch services directly.
//
// Realtime subscriptions are intentionally deferred to Phase 4.
// TODO: subscribe to `messages` INSERT events via supabase.channel() once
// the feature is stable, to enable live-updating threads without polling.
export function useConversation(
  subjectType: SubjectType,
  subjectId: string
): UseConversationResult {
  const [state, setState] = useState<UseConversationState>({
    conversation: null,
    messages: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const conv = await getOrCreateConversation(subjectType, subjectId);
      const msgs = await listMessages(conv.id);
      setState({ conversation: conv, messages: msgs, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [subjectType, subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const post = useCallback(
    async (body: string) => {
      if (!state.conversation) {
        throw new Error("La conversación aún no fue cargada.");
      }
      const msg = await postMessage(state.conversation.id, body);
      await load(); // refresh to include new message + author join
      return msg;
    },
    [state.conversation, load]
  );

  const reply = useCallback(
    async (body: string, parentMessageId: string) => {
      if (!state.conversation) {
        throw new Error("La conversación aún no fue cargada.");
      }
      const msg = await postMessage(state.conversation.id, body, parentMessageId);
      await load();
      return msg;
    },
    [state.conversation, load]
  );

  const remove = useCallback(
    async (messageId: string) => {
      await softDeleteMessage(messageId);
      await load();
    },
    [load]
  );

  const postMedia = useCallback(
    async (
      file: File | Blob,
      kind: "image" | "audio",
      opts?: { body?: string; durationSeconds?: number }
    ) => {
      if (!state.conversation) {
        throw new Error("La conversación aún no fue cargada.");
      }
      // Wrap Blob in a File so uploadChatMedia receives a File (it reads .type and .size)
      const fileToUpload =
        file instanceof File
          ? file
          : new File([file], kind === "audio" ? "audio.webm" : "media", {
              type: file.type || (kind === "audio" ? "audio/webm" : "image/webp"),
            });

      const uploaded = await uploadChatMedia(state.conversation.id, fileToUpload, kind);
      const msg = await postMessage(
        state.conversation.id,
        opts?.body ?? null,
        {
          media: {
            url: uploaded.url,
            type: uploaded.type,
            sizeBytes: uploaded.sizeBytes,
            durationSeconds: opts?.durationSeconds,
          },
        }
      );
      await load();
      return msg;
    },
    [state.conversation, load]
  );

  return {
    ...state,
    post,
    reply,
    remove,
    postMedia,
    refresh: load,
  };
}
