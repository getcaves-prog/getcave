import { createClient } from "@/shared/lib/supabase/client";
import type {
  SeededCommunityInput,
  MessageSubjectType,
} from "@/features/communities/types/community.types";
import type { Tables } from "@/shared/types/database.types";

type Community = Tables<"communities">;
type Message = Tables<"messages">;

/**
 * Creates a community seeded from an external platform.
 *
 * Two-step:
 *  1. create_community RPC (creates the row + owner membership + default channel)
 *  2. update_community_seeded_flags RPC (stamps is_seeded + source metadata)
 *
 * Both RPCs require the caller to be a platform admin (profiles.role = 'admin').
 */
export async function createSeededCommunity(
  input: SeededCommunityInput
): Promise<Community> {
  if (!input.slug || input.slug.trim().length === 0) {
    throw new Error("slug is required");
  }
  if (!input.name || input.name.trim().length === 0) {
    throw new Error("name is required");
  }

  const supabase = createClient();

  // Step 1 — create the community.
  const { data: community, error: createError } = await supabase.rpc(
    "create_community",
    {
      p_slug: input.slug,
      p_name: input.name,
      p_description: input.description,
      p_avatar_url: input.avatarUrl,
      p_cover_url: input.coverUrl,
      p_city: input.city,
      p_zone_id: input.zoneId,
    }
  );

  if (createError || !community) {
    throw new Error(
      `Failed to create seeded community: ${createError?.message ?? "unknown error"}`
    );
  }

  // Step 2 — stamp the seeding flags.
  const { data: seededCommunity, error: flagsError } = await supabase.rpc(
    "update_community_seeded_flags",
    {
      p_community_id: (community as Community).id,
      p_is_seeded: true,
      p_source_platform: input.sourcePlatform,
      p_source_url: input.sourceUrl,
    }
  );

  if (flagsError || !seededCommunity) {
    throw new Error(
      `Failed to set seeded flags: ${flagsError?.message ?? "unknown error"}`
    );
  }

  return seededCommunity as Community;
}

/**
 * Transfers community ownership to a new user.
 * Requires the caller to be a platform admin.
 *
 * The RPC atomically:
 *  - Upserts the new owner into community_members as 'owner'
 *  - Demotes previous owners to 'member'
 *  - Sets claimed_by, claimed_at, is_seeded = false on the community row
 */
export async function transferOwnership(
  communityId: string,
  newOwnerId: string
): Promise<Community> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("transfer_community_ownership", {
    p_community_id: communityId,
    p_new_owner: newOwnerId,
  });

  if (error || !data) {
    throw new Error(
      `Failed to transfer ownership: ${error?.message ?? "unknown error"}`
    );
  }

  return data as Community;
}

/**
 * Posts an official CAVES-authored message into the conversation for any subject.
 * Requires the caller to be a platform admin.
 *
 * The is_official flag on the inserted message bypasses channel write-permission
 * checks (handled in the enforce_channel_write_permission trigger).
 */
export async function postOfficialMessage(
  subjectType: MessageSubjectType,
  subjectId: string,
  body: string
): Promise<Message> {
  if (!body || body.trim().length === 0) {
    throw new Error("body is required");
  }

  const supabase = createClient();

  const { data, error } = await supabase.rpc("post_seeded_message", {
    p_subject_type: subjectType,
    p_subject_id: subjectId,
    p_body: body,
  });

  if (error || !data) {
    throw new Error(
      `Failed to post official message: ${error?.message ?? "unknown error"}`
    );
  }

  return data as Message;
}
