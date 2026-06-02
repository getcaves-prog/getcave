"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import {
  getMyCommunities,
  getMyEvents,
  getMyConversations,
  getRecentActivity,
} from "../services/activity.service";
import type {
  MyCommunity,
  MyEventsResult,
  MyConversation,
  ActivityItem,
} from "../types/activity.types";

// ─── Shared auth helper ────────────────────────────────────────────────────
// Resolves the current user id from Supabase auth when not passed explicitly.
async function resolveUserId(userId?: string): Promise<string> {
  if (userId) return userId;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Tenés que iniciar sesión para ver tu actividad.");
  }

  return user.id;
}

// ─── useMyActivity ─────────────────────────────────────────────────────────
// Unified hook that loads all 4 personal-retention data slices in parallel.
// If userId is not provided, resolves the current authenticated user via
// supabase.auth.getUser(). Throws a friendly error if unauthenticated.
//
// DECISION: Single hook rather than 4 split hooks, because the profile
// page will always render all 4 sections simultaneously. A consumer that
// only needs one slice can destructure the others and ignore them — cost
// is negligible since fetches run in parallel.

interface UseMyActivityState {
  communities: MyCommunity[];
  events: MyEventsResult;
  conversations: MyConversation[];
  recentActivity: ActivityItem[];
  loading: boolean;
  error: Error | null;
}

interface UseMyActivityActions {
  refresh: () => Promise<void>;
}

export type UseMyActivityResult = UseMyActivityState & UseMyActivityActions;

const INITIAL_STATE: UseMyActivityState = {
  communities: [],
  events: { upcoming: [], past: [] },
  conversations: [],
  recentActivity: [],
  loading: true,
  error: null,
};

export function useMyActivity(userId?: string): UseMyActivityResult {
  const [state, setState] = useState<UseMyActivityState>(INITIAL_STATE);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const resolvedId = await resolveUserId(userId);

      // All 4 slices in parallel — independent data, no waterfalls
      const [communities, events, conversations, recentActivity] =
        await Promise.all([
          getMyCommunities(resolvedId),
          getMyEvents(resolvedId),
          getMyConversations(resolvedId),
          getRecentActivity(resolvedId),
        ]);

      setState({
        communities,
        events,
        conversations,
        recentActivity,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    ...state,
    refresh: load,
  };
}

// ─── useMyActivityOptions ──────────────────────────────────────────────────
// Opts-aware variant: expose individual slices with custom limits.
// Useful for pages that show only a subset (e.g. a "Recent activity" widget
// with limit: 5 and no full conversation list needed).

interface UseMyActivityOptions {
  userId?: string;
  conversationsLimit?: number;
  recentActivityLimit?: number;
}

export function useMyActivityWithOptions(
  opts: UseMyActivityOptions = {}
): UseMyActivityResult {
  const { userId, conversationsLimit, recentActivityLimit } = opts;
  const [state, setState] = useState<UseMyActivityState>(INITIAL_STATE);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const resolvedId = await resolveUserId(userId);

      const [communities, events, conversations, recentActivity] =
        await Promise.all([
          getMyCommunities(resolvedId),
          getMyEvents(resolvedId),
          getMyConversations(resolvedId, {
            limit: conversationsLimit,
          }),
          getRecentActivity(resolvedId, {
            limit: recentActivityLimit,
          }),
        ]);

      setState({
        communities,
        events,
        conversations,
        recentActivity,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [userId, conversationsLimit, recentActivityLimit]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    ...state,
    refresh: load,
  };
}
