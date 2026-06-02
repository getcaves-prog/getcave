"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCommunityBySlug,
  getMembership,
  joinCommunity,
  leaveCommunity,
  listCommunityEvents,
} from "../services/community.service";
import type {
  CommunityWithMeta,
  Flyer,
  MemberRole,
} from "../types/community.types";

// ─── State / Actions shapes ────────────────────────────────────────────────

interface UseCommunityState {
  community: CommunityWithMeta | null;
  upcomingEvents: Flyer[];
  pastEvents: Flyer[];
  loading: boolean;
  error: Error | null;
}

interface UseCommunityActions {
  join: () => Promise<void>;
  leave: () => Promise<void>;
  refresh: () => Promise<void>;
}

export type UseCommunityResult = UseCommunityState & UseCommunityActions;

// ─── useCommunity ──────────────────────────────────────────────────────────
// Loads community metadata, current user membership, upcoming and past events
// in parallel. Exposes join/leave/refresh actions.
//
// userId is optional so the hook works for anonymous visitors (myMembership
// will remain null; join/leave will throw at the service layer if called
// without auth).
export function useCommunity(
  slug: string,
  userId?: string
): UseCommunityResult {
  const [state, setState] = useState<UseCommunityState>({
    community: null,
    upcomingEvents: [],
    pastEvents: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const communityBase = await getCommunityBySlug(slug);

      if (!communityBase) {
        setState({
          community: null,
          upcomingEvents: [],
          pastEvents: [],
          loading: false,
          error: null,
        });
        return;
      }

      // Run membership + events in parallel
      const [membershipResult, upcoming, past] = await Promise.all([
        userId ? getMembership(communityBase.id, userId) : Promise.resolve(null),
        listCommunityEvents(communityBase.id, "upcoming"),
        listCommunityEvents(communityBase.id, "past"),
      ]);

      const community: CommunityWithMeta = {
        ...communityBase,
        myMembership: membershipResult
          ? { role: membershipResult.role as MemberRole }
          : null,
      };

      setState({
        community,
        upcomingEvents: upcoming,
        pastEvents: past,
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
  }, [slug, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const join = useCallback(async () => {
    if (!state.community) {
      throw new Error("La comunidad aún no fue cargada.");
    }
    await joinCommunity(state.community.id);
    await load();
  }, [state.community, load]);

  const leave = useCallback(async () => {
    if (!state.community) {
      throw new Error("La comunidad aún no fue cargada.");
    }
    await leaveCommunity(state.community.id);
    await load();
  }, [state.community, load]);

  return {
    ...state,
    join,
    leave,
    refresh: load,
  };
}
