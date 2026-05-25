export interface InvitationStatus {
  enabled: boolean;
  max_capacity: number | null;
  current_count: number;
}

export interface QrInvite {
  id: string;
  flyer_id: string;
  user_id: string;
  qr_token: string;
  display_name: string;
  phone: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

export interface GenerateInviteResult {
  qr_token: string;
  display_name: string;
  already_existed: boolean;
}

export interface CheckinResult {
  display_name: string;
  phone: string | null;
  flyer_title: string;
  already_checked_in: boolean;
  checked_in_at: string;
}

export interface InvitationConfig {
  enabled: boolean;
  passcode: string;
  max_capacity: number | null;
}
