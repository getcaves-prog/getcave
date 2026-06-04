"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listChannels,
  createChannel,
  updateChannel,
  deleteChannel,
} from "../services/channels.service";
import type {
  CommunityChannel,
  CreateChannelInput,
  UpdateChannelInput,
} from "../types/community.types";

// ─── State / Actions shapes ────────────────────────────────────────────────

interface UseChannelsState {
  channels: CommunityChannel[];
  loading: boolean;
  error: Error | null;
}

interface UseChannelsActions {
  create: (input: CreateChannelInput) => Promise<CommunityChannel>;
  update: (channelId: string, input: UpdateChannelInput) => Promise<CommunityChannel>;
  remove: (channelId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export type UseChannelsResult = UseChannelsState & UseChannelsActions;

// ─── useChannels ────────────────────────────────────────────────────────────
// Loads all channels for a community, ordered by position ascending.
// Exposes create/update/remove actions that refresh the list after mutation.
export function useChannels(communityId: string): UseChannelsResult {
  const [state, setState] = useState<UseChannelsState>({
    channels: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const channels = await listChannels(communityId);
      setState({ channels, loading: false, error: null });
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

  const create = useCallback(
    async (input: CreateChannelInput) => {
      const channel = await createChannel(communityId, input);
      await load();
      return channel;
    },
    [communityId, load]
  );

  const update = useCallback(
    async (channelId: string, input: UpdateChannelInput) => {
      const channel = await updateChannel(channelId, input);
      await load();
      return channel;
    },
    [load]
  );

  const remove = useCallback(
    async (channelId: string) => {
      await deleteChannel(channelId);
      await load();
    },
    [load]
  );

  return {
    ...state,
    create,
    update,
    remove,
    refresh: load,
  };
}
