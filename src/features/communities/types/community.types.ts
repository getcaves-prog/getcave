import type { Tables } from "@/shared/types/database.types";

// ─── Raw DB row aliases ────────────────────────────────────────────────────
export type Community = Tables<"communities">;
export type CommunityMember = Tables<"community_members">;
export type CommunityChannel = Tables<"community_channels">;
export type Broadcast = Tables<"broadcasts">;
export type BroadcastPollOption = Tables<"broadcast_poll_options">;
export type BroadcastPollVote = Tables<"broadcast_poll_votes">;
export type Flyer = Tables<"flyers">;

// ─── Role union ─────────────────────────────────────────────────────────────
export type MemberRole = "owner" | "admin" | "member";

// ─── Channel write-permission union ─────────────────────────────────────────
export type WritePermission = "everyone" | "admins_only";

// ─── createCommunity input ──────────────────────────────────────────────────
export interface CreateCommunityInput {
  slug: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  city?: string;
  zoneId?: string;
}

// ─── Enriched types ─────────────────────────────────────────────────────────

/** Community row + current user membership (null = not a member) */
export interface CommunityWithMeta extends Community {
  myMembership: { role: MemberRole } | null;
}

/** Profile shape used in member listings */
export interface MemberProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

/** community_members row + joined profile data */
export interface MemberWithProfile extends CommunityMember {
  profile: MemberProfile | null;
}

// ─── Broadcast / poll ───────────────────────────────────────────────────────
export type BroadcastKind =
  | "announcement"
  | "schedule_change"
  | "location_change"
  | "poll";

export interface CreateBroadcastInput {
  kind: BroadcastKind;
  title?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePollInput {
  title?: string;
  body: string;
  options: string[]; // 2..10 non-empty strings
  expiresAt?: string | null; // ISO 8601 UTC — optional poll deadline
}

/** Per-option result row returned by getPollResults */
export interface PollOptionResult {
  optionId: string;
  label: string;
  voteCount: number;
  myVote: boolean; // true if the current user voted for this option
}

export interface PollResults {
  broadcastId: string;
  options: PollOptionResult[];
  myVotedOptionId: string | null;
}

/** Active poll summary returned by getActivePoll — null when no active poll */
export interface ActivePoll {
  broadcastId: string;
  title: string | null;
  body: string;
  expiresAt: string | null;
  options: PollOptionResult[];
  totalVotes: number;
  myVotedOptionId: string | null;
}

// ─── Channel inputs ──────────────────────────────────────────────────────────
export interface CreateChannelInput {
  name: string;
  description?: string;
  write_permission?: WritePermission;
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  write_permission?: WritePermission;
  position?: number;
  is_default?: boolean;
}

// ─── updateCommunity input ───────────────────────────────────────────────────
export interface UpdateCommunityInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
}

// ─── Seeding inputs ──────────────────────────────────────────────────────────

/** Input for creating a community seeded from an external platform */
export interface SeededCommunityInput {
  slug: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  city?: string;
  zoneId?: string;
  sourcePlatform?: string;
  sourceUrl?: string;
}

/** Subject types accepted by postOfficialMessage */
export type MessageSubjectType = "flyer" | "community" | "channel";
