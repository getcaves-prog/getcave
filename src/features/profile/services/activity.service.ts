import { createClient } from "@/shared/lib/supabase/client";
import type {
  MyCommunity,
  MyEvent,
  MyEventsResult,
  MyConversation,
  ActivityItem,
  JoinedCommunityActivity,
  RsvpEventActivity,
  PostedMessageActivity,
} from "../types/activity.types";

// ─── getMyCommunities ─────────────────────────────────────────────────────
// DECISION: 2-query pattern (mirrors community.service.ts / listMembers).
// Query 1: community_members filtered by user_id, ordered by joined_at desc.
// Query 2: batch-fetch the community rows by community_id.
// In-memory join preserves order from Q1 so caller always gets joined_at desc.
export async function getMyCommunities(userId: string): Promise<MyCommunity[]> {
  const supabase = createClient();

  // Q1: membership rows for this user
  const { data: memberRows, error } = await supabase
    .from("community_members")
    .select("id, community_id, user_id, role, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to get my communities: ${error.message}`);
  }

  const rows = memberRows ?? [];
  if (rows.length === 0) return [];

  // Q2: batch-fetch community rows
  const communityIds = rows.map((r) => r.community_id);

  const { data: communities } = await supabase
    .from("communities")
    .select("id, slug, name, description, avatar_url, cover_url, city, member_count")
    .in("id", communityIds);

  const communityMap = new Map<string, {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    city: string | null;
    member_count: number;
  }>();

  if (communities) {
    for (const c of communities) {
      communityMap.set(c.id, c);
    }
  }

  // In-memory join — preserves joined_at desc order from Q1
  const result: MyCommunity[] = [];
  for (const row of rows) {
    const community = communityMap.get(row.community_id);
    if (!community) continue;
    result.push({
      id: community.id,
      slug: community.slug,
      name: community.name,
      description: community.description,
      avatar_url: community.avatar_url,
      cover_url: community.cover_url,
      city: community.city,
      member_count: community.member_count,
      role: row.role,
      joined_at: row.joined_at,
    });
  }

  return result;
}

// ─── getMyEvents ──────────────────────────────────────────────────────────
// DECISION: 2-query pattern.
// Q1: event_attendance rows for user_id, ordered by created_at desc.
// Q2: batch-fetch flyer rows by flyer_id.
// Split upcoming/past by comparing flyer.event_date vs today (YYYY-MM-DD).
// Null event_date → treated as past (no date = indeterminate = not upcoming).
export async function getMyEvents(userId: string): Promise<MyEventsResult> {
  const supabase = createClient();

  // Q1: attendance rows
  const { data: attendanceRows, error } = await supabase
    .from("event_attendance")
    .select("id, flyer_id, user_id, going_solo, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Failed to get my events: ${error.message}`);
  }

  const rows = attendanceRows ?? [];
  if (rows.length === 0) return { upcoming: [], past: [] };

  // Q2: batch-fetch flyer rows
  const flyerIds = rows.map((r) => r.flyer_id);

  const { data: flyers } = await supabase
    .from("flyers")
    .select("id, title, image_url, event_date, event_time, address")
    .in("id", flyerIds);

  const flyerMap = new Map<string, {
    id: string;
    title: string | null;
    image_url: string;
    event_date: string | null;
    event_time: string | null;
    address: string | null;
  }>();

  if (flyers) {
    for (const f of flyers) {
      flyerMap.set(f.id, f);
    }
  }

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const upcoming: MyEvent[] = [];
  const past: MyEvent[] = [];

  for (const row of rows) {
    const flyer = flyerMap.get(row.flyer_id);
    if (!flyer) continue;

    const event: MyEvent = {
      id: flyer.id,
      title: flyer.title,
      image_url: flyer.image_url,
      event_date: flyer.event_date,
      event_time: flyer.event_time,
      address: flyer.address,
      going_solo: row.going_solo,
      rsvp_at: row.created_at,
    };

    // Null event_date → past bucket
    if (flyer.event_date && flyer.event_date >= today) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  }

  return { upcoming, past };
}

// ─── getMyConversations ───────────────────────────────────────────────────
// DECISION: 3-query pattern (extension of 2-query profile-join).
// Q1: messages WHERE author_id = userId → collect distinct conversation_ids.
//     last_activity_at = max(created_at) per conversation (in-memory).
// Q2: conversations WHERE id IN (conv_ids) → get subject_type + subject_id.
// Q3a: flyers WHERE id IN (flyer_subject_ids) → title labels.
// Q3b: communities WHERE id IN (community_subject_ids) → name labels.
// All resolved in-memory. De-dup by conversation_id before returning.
// opts.limit applied after de-dup (default 50).
export async function getMyConversations(
  userId: string,
  opts?: { limit?: number }
): Promise<MyConversation[]> {
  const supabase = createClient();
  const limit = opts?.limit ?? 50;

  // Q1: messages by this author
  const { data: messageRows, error } = await supabase
    .from("messages")
    .select("id, conversation_id, author_id, body, created_at, is_deleted")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(500); // fetch more so de-dup+limit works correctly

  if (error) {
    throw new Error(`Failed to get my conversations: ${error.message}`);
  }

  const messages = messageRows ?? [];
  if (messages.length === 0) return [];

  // De-dup: keep max created_at per conversation_id
  const lastActivityMap = new Map<string, string>();
  for (const msg of messages) {
    const existing = lastActivityMap.get(msg.conversation_id);
    if (!existing || msg.created_at > existing) {
      lastActivityMap.set(msg.conversation_id, msg.created_at);
    }
  }

  const conversationIds = Array.from(lastActivityMap.keys());

  // Q2: fetch conversation rows for subject resolution
  const { data: convRows } = await supabase
    .from("conversations")
    .select("id, subject_type, subject_id, created_at")
    .in("id", conversationIds);

  const convMap = new Map<string, { id: string; subject_type: string; subject_id: string }>();
  if (convRows) {
    for (const c of convRows) {
      convMap.set(c.id, c);
    }
  }

  // Partition subject_ids by type
  const flyerSubjectIds: string[] = [];
  const communitySubjectIds: string[] = [];
  const channelSubjectIds: string[] = [];

  for (const conv of convMap.values()) {
    if (conv.subject_type === "flyer") {
      flyerSubjectIds.push(conv.subject_id);
    } else if (conv.subject_type === "community") {
      communitySubjectIds.push(conv.subject_id);
    } else if (conv.subject_type === "channel") {
      channelSubjectIds.push(conv.subject_id);
    }
  }

  // Q3a: flyer labels
  const flyerLabelMap = new Map<string, string | null>();
  if (flyerSubjectIds.length > 0) {
    const { data: flyerRows } = await supabase
      .from("flyers")
      .select("id, title")
      .in("id", flyerSubjectIds);
    if (flyerRows) {
      for (const f of flyerRows) {
        flyerLabelMap.set(f.id, f.title);
      }
    }
  }

  // Q3b: community labels + slugs (slug is needed for deep-link routing)
  const communityLabelMap = new Map<string, string | null>();
  const communitySlugMap = new Map<string, string>();
  if (communitySubjectIds.length > 0) {
    const { data: communityRows } = await supabase
      .from("communities")
      .select("id, name, slug")
      .in("id", communitySubjectIds);
    if (communityRows) {
      for (const c of communityRows) {
        communityLabelMap.set(c.id, c.name);
        communitySlugMap.set(c.id, c.slug);
      }
    }
  }

  // Q3c: channel labels (channel name) + parent community slug + community name for routing/chip
  const channelLabelMap = new Map<string, string | null>();
  const channelSlugMap = new Map<string, string>();
  const channelCommunityNameMap = new Map<string, string>();
  if (channelSubjectIds.length > 0) {
    const { data: channelRows } = await supabase
      .from("community_channels")
      .select("id, name, community_id")
      .in("id", channelSubjectIds);
    if (channelRows) {
      const parentIds = [...new Set(channelRows.map((c) => c.community_id))];
      const slugByCommunity = new Map<string, string>();
      const nameByCommunity = new Map<string, string>();
      if (parentIds.length > 0) {
        const { data: parents } = await supabase
          .from("communities")
          .select("id, slug, name")
          .in("id", parentIds);
        if (parents) {
          for (const p of parents) {
            slugByCommunity.set(p.id, p.slug);
            nameByCommunity.set(p.id, p.name);
          }
        }
      }
      for (const ch of channelRows) {
        channelLabelMap.set(ch.id, ch.name);
        const slug = slugByCommunity.get(ch.community_id);
        if (slug) channelSlugMap.set(ch.id, slug);
        const cname = nameByCommunity.get(ch.community_id);
        if (cname) channelCommunityNameMap.set(ch.id, cname);
      }
    }
  }

  // Build result — one entry per conversation_id, ordered by last_activity_at desc
  const result: MyConversation[] = conversationIds
    .map((convId) => {
      const conv = convMap.get(convId);
      if (!conv) return null;

      let subjectLabel: string | null = null;
      let communitySlug: string | null = null;
      let communityName: string | null = null;
      if (conv.subject_type === "flyer") {
        subjectLabel = flyerLabelMap.get(conv.subject_id) ?? null;
      } else if (conv.subject_type === "community") {
        subjectLabel = communityLabelMap.get(conv.subject_id) ?? null;
        communitySlug = communitySlugMap.get(conv.subject_id) ?? null;
      } else if (conv.subject_type === "channel") {
        subjectLabel = channelLabelMap.get(conv.subject_id) ?? null;
        communitySlug = channelSlugMap.get(conv.subject_id) ?? null;
        communityName = channelCommunityNameMap.get(conv.subject_id) ?? null;
      }

      return {
        conversation_id: convId,
        subject_type: conv.subject_type,
        subject_id: conv.subject_id,
        subject_label: subjectLabel,
        community_slug: communitySlug,
        community_name: communityName,
        last_activity_at: lastActivityMap.get(convId)!,
      };
    })
    .filter((c): c is MyConversation => c !== null)
    .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at))
    .slice(0, limit);

  return result;
}

// ─── getRecentActivity ────────────────────────────────────────────────────
// DECISION: Fetch 3 data slices in parallel, then merge + sort in-memory.
// No server-side merge needed at MVP scale (community small, activity sparse).
//
// Slice A: community joins (community_members + communities for names)
// Slice B: event RSVPs (event_attendance + flyers for titles)
// Slice C: messages posted (messages only — no subject resolution needed here)
//
// Each slice runs independently. Merge result, sort desc by timestamp, slice
// to limit (default 20).
export async function getRecentActivity(
  userId: string,
  opts?: { limit?: number }
): Promise<ActivityItem[]> {
  const supabase = createClient();
  const limit = opts?.limit ?? 20;

  // ── Slice A: community joins ─────────────────────────────────────────────
  const fetchJoins = async (): Promise<JoinedCommunityActivity[]> => {
    const { data: memberRows } = await supabase
      .from("community_members")
      .select("community_id, role, joined_at")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .limit(50);

    if (!memberRows || memberRows.length === 0) return [];

    const communityIds = memberRows.map((r) => r.community_id);
    const { data: communities } = await supabase
      .from("communities")
      .select("id, name, slug")
      .in("id", communityIds);

    const communityMap = new Map<string, { name: string; slug: string }>();
    if (communities) {
      for (const c of communities) {
        communityMap.set(c.id, { name: c.name, slug: c.slug });
      }
    }

    return memberRows
      .map((row): JoinedCommunityActivity | null => {
        const community = communityMap.get(row.community_id);
        if (!community) return null;
        return {
          type: "joined_community",
          timestamp: row.joined_at,
          community_id: row.community_id,
          community_name: community.name,
          community_slug: community.slug,
        };
      })
      .filter((a): a is JoinedCommunityActivity => a !== null);
  };

  // ── Slice B: event RSVPs ─────────────────────────────────────────────────
  const fetchRsvps = async (): Promise<RsvpEventActivity[]> => {
    const { data: attendanceRows } = await supabase
      .from("event_attendance")
      .select("flyer_id, going_solo, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!attendanceRows || attendanceRows.length === 0) return [];

    const flyerIds = attendanceRows.map((r) => r.flyer_id);
    const { data: flyers } = await supabase
      .from("flyers")
      .select("id, title, event_date")
      .in("id", flyerIds);

    const flyerMap = new Map<string, { title: string | null }>();
    if (flyers) {
      for (const f of flyers) {
        flyerMap.set(f.id, { title: f.title });
      }
    }

    return attendanceRows.map((row): RsvpEventActivity => {
      const flyer = flyerMap.get(row.flyer_id);
      return {
        type: "rsvp_event",
        timestamp: row.created_at,
        flyer_id: row.flyer_id,
        flyer_title: flyer?.title ?? null,
        going_solo: row.going_solo,
      };
    });
  };

  // ── Slice C: messages posted ─────────────────────────────────────────────
  const fetchMessages = async (): Promise<PostedMessageActivity[]> => {
    const { data: messageRows } = await supabase
      .from("messages")
      .select("id, conversation_id, body, created_at, is_deleted")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!messageRows || messageRows.length === 0) return [];

    return messageRows.map((row): PostedMessageActivity => ({
      type: "posted_message",
      timestamp: row.created_at,
      message_id: row.id,
      conversation_id: row.conversation_id,
      // Null body for soft-deleted messages (same pattern as listMessages)
      body_preview: row.is_deleted ? null : (row.body?.slice(0, 100) ?? null),
    }));
  };

  // ── Parallel fetch + merge ───────────────────────────────────────────────
  const [joins, rsvps, messages] = await Promise.all([
    fetchJoins(),
    fetchRsvps(),
    fetchMessages(),
  ]);

  const merged: ActivityItem[] = [...joins, ...rsvps, ...messages];

  // Sort by timestamp descending, then slice to limit
  merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return merged.slice(0, limit);
}
