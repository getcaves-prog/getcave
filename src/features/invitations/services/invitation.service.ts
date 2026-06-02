import { createClient } from "@/shared/lib/supabase/client";
import type {
  InvitationStatus,
  QrInvite,
  GenerateInviteResult,
  CheckinResult,
} from "../types/invitation.types";

export async function getInvitationStatus(
  flyerId: string
): Promise<InvitationStatus | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_invitation_status", {
    p_flyer_id: flyerId,
  });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    enabled: row.enabled,
    max_capacity: row.max_capacity ?? null,
    current_count: row.current_count,
  };
}

export async function saveInvitationConfig(
  flyerId: string,
  passcode: string,
  enabled: boolean,
  maxCapacity: number | null
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("save_invitation_config", {
    p_flyer_id: flyerId,
    p_passcode: passcode,
    p_enabled: enabled,
    p_max_capacity: maxCapacity ?? undefined,
  });
  if (error) throw new Error(error.message);
}

export async function verifyAndGetInvite(
  flyerId: string,
  passcode: string,
  displayName: string,
  phone: string | null
): Promise<GenerateInviteResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("verify_and_get_invite", {
    p_flyer_id: flyerId,
    p_passcode: passcode,
    p_display_name: displayName,
    p_phone: phone ?? undefined,
  });
  if (error) throw new Error(error.message);
  const row = data[0];
  return {
    qr_token: row.qr_token,
    display_name: row.display_name,
    already_existed: row.already_existed,
  };
}

export async function checkinQrInvite(
  qrToken: string
): Promise<CheckinResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("checkin_qr_invite", {
    p_qr_token: qrToken,
  });
  if (error) throw new Error(error.message);
  const row = data[0];
  return {
    display_name: row.display_name,
    phone: row.phone,
    flyer_title: row.flyer_title,
    already_checked_in: row.already_checked_in,
    checked_in_at: row.checked_in_at,
  };
}

export async function getMyInviteForFlyer(
  flyerId: string
): Promise<QrInvite | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("event_qr_invites")
    .select("*")
    .eq("flyer_id", flyerId)
    .maybeSingle();
  return data as QrInvite | null;
}

export async function getEventAttendees(
  flyerId: string
): Promise<QrInvite[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("event_qr_invites")
    .select("*")
    .eq("flyer_id", flyerId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as QrInvite[];
}
