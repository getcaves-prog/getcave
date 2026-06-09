import type { Tables } from "@/shared/types/database.types";

// ─── Raw DB row aliases ────────────────────────────────────────────────────
export type CommunityRow = Tables<"communities">;
export type CommunityMemberRow = Tables<"community_members">;
export type FlyerRow = Tables<"flyers">;
export type MessageRow = Tables<"messages">;
export type ConversationRow = Tables<"conversations">;
export type EventAttendanceRow = Tables<"event_attendance">;

// ─── MyCommunity ──────────────────────────────────────────────────────────
/** A community the user belongs to, enriched with their role. */
export interface MyCommunity {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  city: string | null;
  member_count: number;
  /** The user's role in this community */
  role: string;
  joined_at: string;
}

// ─── MyEvent ──────────────────────────────────────────────────────────────
/** A flyer the user RSVP'd to (via event_attendance). */
export interface MyEvent {
  id: string;
  title: string | null;
  image_url: string;
  event_date: string | null;
  event_time: string | null;
  address: string | null;
  /** Whether the user is going solo */
  going_solo: boolean;
  /** When the user RSVP'd */
  rsvp_at: string;
  /** Display name of the community this flyer belongs to (null if none) */
  community_name: string | null;
  /** URL slug of the community this flyer belongs to (null if none) */
  community_slug: string | null;
}

export interface MyEventsResult {
  upcoming: MyEvent[];
  past: MyEvent[];
}

// ─── MyConversation ───────────────────────────────────────────────────────
/** A conversation thread the user has posted in. */
export interface MyConversation {
  conversation_id: string;
  subject_type: string;
  subject_id: string;
  /** Human label: flyer title or community name */
  subject_label: string | null;
  /**
   * Routing slug for community subjects — used to build /communities/[slug].
   * Null for flyer subjects (those link via subject_id directly).
   */
  community_slug: string | null;
  /**
   * For channel conversations: the parent community's display name.
   * Used as the chip label instead of the literal "CHANNEL" fallback.
   */
  community_name: string | null;
  /** ISO timestamp of the user's most recent message in this conversation */
  last_activity_at: string;
}

// ─── ActivityItem — discriminated union ───────────────────────────────────

export interface JoinedCommunityActivity {
  type: "joined_community";
  timestamp: string;
  community_id: string;
  community_name: string;
  community_slug: string;
}

export interface RsvpEventActivity {
  type: "rsvp_event";
  timestamp: string;
  flyer_id: string;
  flyer_title: string | null;
  going_solo: boolean;
}

export interface PostedMessageActivity {
  type: "posted_message";
  timestamp: string;
  message_id: string;
  conversation_id: string;
  body_preview: string | null;
}

export type ActivityItem =
  | JoinedCommunityActivity
  | RsvpEventActivity
  | PostedMessageActivity;
