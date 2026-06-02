import { createClient } from "@/shared/lib/supabase/client";
import type { Tables } from "@/shared/types/database.types";
import type {
  Community,
  CommunityWithMeta,
  CreateCommunityInput,
  Flyer,
  MemberRole,
  MemberWithProfile,
} from "../types/community.types";

// ─── createCommunity ───────────────────────────────────────────────────────
// Calls the SECURITY DEFINER RPC create_community which creates the community
// row AND an 'owner' community_members row in a single transaction.
// Client-side validation fires before any network call (fail fast).
export async function createCommunity(input: CreateCommunityInput): Promise<Community> {
  const slug = input.slug?.trim();
  const name = input.name?.trim();

  if (!slug) {
    throw new Error("El campo slug no puede estar vacío.");
  }
  if (!name) {
    throw new Error("El campo name no puede estar vacío.");
  }

  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_community", {
    p_slug: slug,
    p_name: name,
    p_description: input.description,
    p_avatar_url: input.avatarUrl,
    p_cover_url: input.coverUrl,
    p_city: input.city,
    p_zone_id: input.zoneId,
  });

  if (error) {
    throw new Error(`Failed to create community: ${error.message}`);
  }

  return data as Community;
}

// ─── getCommunityBySlug ────────────────────────────────────────────────────
// Returns the community row or null if not found.
// DECISION: myMembership is NOT included here to keep read path fast and
// public. Use getMembership() separately when auth state is available.
export async function getCommunityBySlug(slug: string): Promise<CommunityWithMeta | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get community: ${error.message}`);
  }

  if (!data) return null;

  return { ...(data as Community), myMembership: null };
}

// ─── listCommunities ───────────────────────────────────────────────────────
// Lists communities ordered by member_count desc. Optional city filter.
// MVP limit: 50 (sane default — no pagination needed at this scale).
export async function listCommunities(opts?: {
  city?: string;
  limit?: number;
}): Promise<Community[]> {
  const supabase = createClient();

  let query = supabase
    .from("communities")
    .select("*");

  if (opts?.city) {
    query = query.eq("city", opts.city) as typeof query;
  }

  const { data, error } = await (query as ReturnType<typeof query.order>)
    .order("member_count", { ascending: false })
    .limit(opts?.limit ?? 50);

  if (error) {
    throw new Error(`Failed to list communities: ${error.message}`);
  }

  return (data ?? []) as Community[];
}

// ─── joinCommunity ─────────────────────────────────────────────────────────
// Inserts the current user as a 'member'. RLS enforces user_id = auth.uid().
// DB trigger increments communities.member_count automatically.
export async function joinCommunity(communityId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Tenés que iniciar sesión para unirte a una comunidad.");
  }

  const { error } = await supabase.from("community_members").insert({
    community_id: communityId,
    user_id: user.id,
    role: "member",
  });

  if (error) {
    throw new Error(`Failed to join community: ${error.message}`);
  }
}

// ─── leaveCommunity ────────────────────────────────────────────────────────
// Deletes own membership row. RLS USING(user_id = auth.uid()) enforces this.
// DB trigger decrements communities.member_count automatically.
export async function leaveCommunity(communityId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Tenés que iniciar sesión para salir de una comunidad.");
  }

  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to leave community: ${error.message}`);
  }
}

// ─── getMembership ─────────────────────────────────────────────────────────
// Returns the role for a given community + user pair, or null if not a member.
export async function getMembership(
  communityId: string,
  userId: string
): Promise<{ role: MemberRole } | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get membership: ${error.message}`);
  }

  if (!data) return null;

  return { role: data.role as MemberRole };
}

// ─── listMembers ───────────────────────────────────────────────────────────
// DECISION: 2-query approach mirrors conversation.service pattern.
// community_members.user_id → auth.users(id) = profiles.id, but no direct FK
// in generated types, so we batch-fetch profiles by user_ids separately.
// Limit: 100 (MVP — communities are small at launch).
export async function listMembers(
  communityId: string,
  opts?: { limit?: number }
): Promise<MemberWithProfile[]> {
  const supabase = createClient();

  // Query 1: membership rows
  const { data: memberRows, error } = await supabase
    .from("community_members")
    .select("id, community_id, user_id, role, joined_at")
    .eq("community_id", communityId)
    .order("joined_at", { ascending: true })
    .limit(opts?.limit ?? 100);

  if (error) {
    throw new Error(`Failed to list members: ${error.message}`);
  }

  const rows = (memberRows ?? []) as Tables<"community_members">[];

  if (rows.length === 0) return [];

  // Query 2: batch-fetch profiles for all user_ids
  const userIds = rows.map((r) => r.user_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  const profileMap = new Map<
    string,
    { id: string; username: string; avatar_url: string | null }
  >();
  if (profiles) {
    for (const p of profiles) {
      profileMap.set(p.id, p);
    }
  }

  return rows.map((row) => ({
    ...row,
    profile: profileMap.get(row.user_id) ?? null,
  }));
}

// ─── listCommunityEvents ───────────────────────────────────────────────────
// Returns flyers linked to a community, split by upcoming vs past based on
// event_date relative to today (ISO date string comparison is valid for
// YYYY-MM-DD format). Flyers without event_date are excluded.
// Limit: 50 per direction (MVP).
export async function listCommunityEvents(
  communityId: string,
  when: "upcoming" | "past"
): Promise<Flyer[]> {
  const supabase = createClient();

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  let query = supabase
    .from("flyers")
    .select("*")
    .eq("community_id", communityId);

  if (when === "upcoming") {
    query = query.gte("event_date", today) as typeof query;
    const { data, error } = await (query as ReturnType<typeof query.order>)
      .order("event_date", { ascending: true })
      .limit(50);

    if (error) {
      throw new Error(`Failed to list community events: ${error.message}`);
    }
    return (data ?? []) as Flyer[];
  } else {
    query = query.lte("event_date", today) as typeof query;
    const { data, error } = await (query as ReturnType<typeof query.order>)
      .order("event_date", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to list community events: ${error.message}`);
    }
    return (data ?? []) as Flyer[];
  }
}

// ─── promoteMember ─────────────────────────────────────────────────────────
// Calls the SECURITY DEFINER RPC promote_community_member which validates
// that the caller is an owner/admin before updating the role.
export async function promoteMember(
  communityId: string,
  userId: string,
  role: MemberRole
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("promote_community_member", {
    p_community_id: communityId,
    p_user_id: userId,
    p_role: role,
  });

  if (error) {
    throw new Error(`Failed to promote member: ${error.message}`);
  }
}
