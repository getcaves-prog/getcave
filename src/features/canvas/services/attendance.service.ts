import { createClient } from "@/shared/lib/supabase/client";

// ─── Public return types ───────────────────────────────────────────────────
export interface AttendanceCounts {
  total: number;
  solo: number;
}

export interface OwnAttendance {
  going: boolean;
  goingSolo: boolean;
}

export interface AttendanceResult {
  counts: AttendanceCounts;
  mine: OwnAttendance;
}

// ─── getAttendance ─────────────────────────────────────────────────────────
// Fetches the public counts via the flyer_attendance_counts RPC.
// If userId is provided, also checks whether that user has an RSVP row.
// TODO: future — join both in a single RPC to reduce round-trips.
export async function getAttendance(
  flyerId: string,
  userId?: string
): Promise<AttendanceResult> {
  const supabase = createClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "flyer_attendance_counts",
    { p_flyer_id: flyerId }
  );

  if (rpcError) {
    throw new Error(`Failed to get attendance: ${rpcError.message}`);
  }

  const row = (rpcData ?? [])[0] as
    | { total_count: number; solo_count: number }
    | undefined;

  const counts: AttendanceCounts = {
    total: row?.total_count ?? 0,
    solo: row?.solo_count ?? 0,
  };

  if (!userId) {
    return { counts, mine: { going: false, goingSolo: false } };
  }

  // Check if the current user has an attendance row
  const { data: ownRow } = await supabase
    .from("event_attendance")
    .select("going_solo")
    .eq("flyer_id", flyerId)
    .eq("user_id", userId)
    .maybeSingle();

  const mine: OwnAttendance = ownRow
    ? { going: true, goingSolo: ownRow.going_solo }
    : { going: false, goingSolo: false };

  return { counts, mine };
}

// ─── setAttendance ─────────────────────────────────────────────────────────
// Upserts the current user's attendance row.
// DECISION: user_id is resolved from the active Supabase auth session
// (supabase.auth.getUser()) rather than being passed as a parameter.
// This makes the service self-contained and avoids the caller needing
// to manage session state. RLS enforces that author_id === auth.uid() anyway,
// so the resolution is authoritative.
// The user_id is required in the upsert payload for the UNIQUE(flyer_id,user_id)
// conflict target to work correctly.
export async function setAttendance(
  flyerId: string,
  goingSolo: boolean = false
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Tenés que iniciar sesión para confirmar asistencia.");
  }

  const { error } = await supabase.from("event_attendance").upsert(
    {
      flyer_id: flyerId,
      user_id: user.id,
      going_solo: goingSolo,
    },
    { onConflict: "flyer_id,user_id" }
  );

  if (error) {
    throw new Error(`Failed to set attendance: ${error.message}`);
  }
}

// ─── clearAttendance ──────────────────────────────────────────────────────
// Deletes the current user's RSVP row (un-RSVP).
// RLS USING(user_id = auth.uid()) ensures only own row can be deleted.
export async function clearAttendance(flyerId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("event_attendance")
    .delete()
    .eq("flyer_id", flyerId);

  if (error) {
    throw new Error(`Failed to clear attendance: ${error.message}`);
  }
}
