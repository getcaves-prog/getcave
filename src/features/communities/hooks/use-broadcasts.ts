"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listBroadcasts,
  createBroadcast,
  createPoll,
  votePoll,
} from "../services/broadcast.service";
import type {
  Broadcast,
  BroadcastKind,
  CreateBroadcastInput,
  CreatePollInput,
} from "../types/community.types";

// ─── State / Actions shapes ────────────────────────────────────────────────

interface UseBroadcastsState {
  broadcasts: Broadcast[];
  loading: boolean;
  error: Error | null;
}

interface UseBroadcastsActions {
  post: (input: CreateBroadcastInput) => Promise<Broadcast>;
  poll: (input: CreatePollInput) => Promise<Broadcast>;
  vote: (broadcastId: string, optionId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export type UseBroadcastsResult = UseBroadcastsState & UseBroadcastsActions;

// ─── useBroadcasts ─────────────────────────────────────────────────────────
// Loads broadcasts for a community on mount. Exposes post/poll/vote actions
// that refresh the list after mutation.
export function useBroadcasts(communityId: string): UseBroadcastsResult {
  const [state, setState] = useState<UseBroadcastsState>({
    broadcasts: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const broadcasts = await listBroadcasts(communityId);
      setState({ broadcasts, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  const post = useCallback(
    async (input: CreateBroadcastInput) => {
      const broadcast = await createBroadcast(communityId, input);
      await load();
      return broadcast;
    },
    [communityId, load]
  );

  const poll = useCallback(
    async (input: CreatePollInput) => {
      const broadcast = await createPoll(communityId, input);
      await load();
      return broadcast;
    },
    [communityId, load]
  );

  const vote = useCallback(
    async (broadcastId: string, optionId: string) => {
      await votePoll(broadcastId, optionId);
      await load();
    },
    [load]
  );

  return {
    ...state,
    post,
    poll,
    vote,
    refresh: load,
  };
}
