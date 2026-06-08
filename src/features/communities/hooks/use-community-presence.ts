"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Presence payload tracked for each connected user ─────────────────────
interface PresencePayload {
  user_id: string;
  username: string;
}

// ─── User shape expected by the hook ──────────────────────────────────────
export interface PresenceUser {
  id: string;
  username: string;
}

// ─── Return value ──────────────────────────────────────────────────────────
export interface UseCommunityPresenceResult {
  /** Number of distinct users currently present in the community channel */
  count: number;
}

// ─── useCommunityPresence ──────────────────────────────────────────────────
// Joins a Supabase Realtime presence channel for the given communityId.
// If `user` is provided, tracks the current user's presence on the channel.
// Returns { count } — the number of distinct currently-present users.
//
// SSR-safe: the Supabase client is only created on the client side (createClient
// uses createBrowserClient internally). The hook is marked "use client" and
// guards against running in a no-window environment via the useEffect lifecycle.
//
// Cleanup: the channel is unsubscribed and removed on unmount or when
// communityId changes, preventing memory leaks and stale subscriptions.
export function useCommunityPresence(
  communityId: string,
  user: PresenceUser | null
): UseCommunityPresenceResult {
  const [count, setCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Guard: don't run during SSR
    if (typeof window === "undefined") return;

    const supabase = createClient();
    const channelName = `presence:community:${communityId}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user?.id ?? "anon",
        },
      },
    });

    channelRef.current = channel;

    // Track the current user's presence if authenticated
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePayload>();
        // Each key maps to an array of presences; collect distinct user_ids
        const distinctUserIds = new Set<string>();
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            if (p.user_id) {
              distinctUserIds.add(p.user_id);
            }
          }
        }
        setCount(distinctUserIds.size);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && user) {
          await channel.track({
            user_id: user.id,
            username: user.username,
          } satisfies PresencePayload);
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [communityId, user?.id, user?.username]);

  return { count };
}
