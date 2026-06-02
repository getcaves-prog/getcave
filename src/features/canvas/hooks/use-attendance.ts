"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAttendance,
  setAttendance,
  clearAttendance,
} from "../services/attendance.service";

interface UseAttendanceState {
  total: number;
  solo: number;
  going: boolean;
  goingSolo: boolean;
  loading: boolean;
  error: Error | null;
}

interface UseAttendanceActions {
  toggleGoing: () => Promise<void>;
  toggleSolo: () => Promise<void>;
  refresh: () => Promise<void>;
}

export type UseAttendanceResult = UseAttendanceState & UseAttendanceActions;

// ─── useAttendance ─────────────────────────────────────────────────────────
// Fetches attendance counts + own row state on mount.
// toggleGoing: if currently going → clearAttendance (un-RSVP);
//              if not going → setAttendance(flyerId, false).
// toggleSolo:  if currently going+solo → setAttendance(flyerId, false) (keep going but not solo);
//              if going but not solo → setAttendance(flyerId, true);
//              if not going → setAttendance(flyerId, true) (marks going + solo).
//
// userId must be provided from the auth session for the `mine` state to be
// populated. Without it, going/goingSolo will always be false (anonymous view).
//
// TODO: optimistic updates for snappier UX — blocked on Phase 4 realtime.
export function useAttendance(
  flyerId: string,
  userId?: string
): UseAttendanceResult {
  const [state, setState] = useState<UseAttendanceState>({
    total: 0,
    solo: 0,
    going: false,
    goingSolo: false,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await getAttendance(flyerId, userId);
      setState({
        total: result.counts.total,
        solo: result.counts.solo,
        going: result.mine.going,
        goingSolo: result.mine.goingSolo,
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
  }, [flyerId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleGoing = useCallback(async () => {
    if (state.going) {
      await clearAttendance(flyerId);
    } else {
      await setAttendance(flyerId, false);
    }
    await load();
  }, [flyerId, state.going, load]);

  const toggleSolo = useCallback(async () => {
    if (!state.going) {
      // Not going yet → mark as going + solo
      await setAttendance(flyerId, true);
    } else if (state.goingSolo) {
      // Going + solo → keep going, remove solo
      await setAttendance(flyerId, false);
    } else {
      // Going but not solo → upgrade to going + solo
      await setAttendance(flyerId, true);
    }
    await load();
  }, [flyerId, state.going, state.goingSolo, load]);

  return {
    ...state,
    toggleGoing,
    toggleSolo,
    refresh: load,
  };
}
