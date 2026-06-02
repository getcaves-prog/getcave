import { createClient } from "@/shared/lib/supabase/client";
import type { Json, Tables } from "@/shared/types/database.types";
import type {
  Broadcast,
  BroadcastKind,
  CreateBroadcastInput,
  CreatePollInput,
  PollResults,
} from "../types/community.types";

// ─── listBroadcasts ────────────────────────────────────────────────────────
// Lists all broadcasts for a community, newest first.
// Limit: 50 (MVP — no pagination at this scale).
export async function listBroadcasts(communityId: string): Promise<Broadcast[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to list broadcasts: ${error.message}`);
  }

  return (data ?? []) as Broadcast[];
}

// ─── createBroadcast ───────────────────────────────────────────────────────
// Inserts a broadcast authored by the current user.
// RLS enforces that the inserting user is an owner/admin of the community.
export async function createBroadcast(
  communityId: string,
  input: CreateBroadcastInput
): Promise<Broadcast> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Tenés que iniciar sesión para publicar un anuncio.");
  }

  const { data, error } = await supabase
    .from("broadcasts")
    .insert({
      community_id: communityId,
      author_id: user.id,
      kind: input.kind as string,
      title: input.title ?? null,
      body: input.body,
      metadata: (input.metadata ?? null) as Json | null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create broadcast: ${error.message}`);
  }

  return data as Broadcast;
}

// ─── createPoll ────────────────────────────────────────────────────────────
// Creates a broadcast with kind='poll' then inserts poll options in a
// second query. DECISION: two queries (not a transaction) is acceptable for
// MVP since: (a) the poll is useless without options but the broadcast row
// visibility is harmless on its own, and (b) avoiding an RPC keeps the
// schema simpler. A true transaction can be added if data integrity becomes
// an issue.
// Validation: at least 2 options required (a single-option poll is nonsensical).
export async function createPoll(
  communityId: string,
  input: CreatePollInput
): Promise<Broadcast> {
  if (!input.options || input.options.length < 2) {
    throw new Error("Un poll necesita al menos 2 options.");
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Tenés que iniciar sesión para crear un poll.");
  }

  // Insert the broadcast row
  const { data: broadcast, error: broadcastError } = await supabase
    .from("broadcasts")
    .insert({
      community_id: communityId,
      author_id: user.id,
      kind: "poll" as string,
      title: input.title ?? null,
      body: input.body,
      metadata: null,
    })
    .select()
    .single();

  if (broadcastError) {
    throw new Error(`Failed to create poll: ${broadcastError.message}`);
  }

  const broadcastRow = broadcast as Tables<"broadcasts">;

  // Insert poll options with positions
  const optionInserts = input.options.map((label, index) => ({
    broadcast_id: broadcastRow.id,
    label,
    position: index,
  }));

  const { error: optionsError } = await supabase
    .from("broadcast_poll_options")
    .insert(optionInserts);

  if (optionsError) {
    throw new Error(`Failed to create poll options: ${optionsError.message}`);
  }

  return broadcastRow as Broadcast;
}

// ─── votePoll ──────────────────────────────────────────────────────────────
// Inserts a vote for the current user. RLS + DB UNIQUE(broadcast_id,user_id)
// enforces one vote per user per poll.
export async function votePoll(broadcastId: string, optionId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Tenés que iniciar sesión para votar.");
  }

  const { error } = await supabase.from("broadcast_poll_votes").insert({
    broadcast_id: broadcastId,
    option_id: optionId,
    user_id: user.id,
  });

  if (error) {
    throw new Error(`Failed to vote: ${error.message}`);
  }
}

// ─── getPollResults ────────────────────────────────────────────────────────
// DECISION: 2-query approach — fetch options then all votes for the broadcast.
// Aggregate in-memory: for MVP poll sizes (< 1000 votes) this is negligible.
// A GROUP BY query would need a raw SQL RPC; the simple 2-query approach keeps
// things in the type-safe supabase-js API.
// myVote flag: requires current user from auth (gracefully null if anonymous).
export async function getPollResults(broadcastId: string): Promise<PollResults> {
  const supabase = createClient();

  // Get current user (optional — we don't throw if unauthenticated)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  // Query 1: options ordered by position
  const { data: optionRows, error: optionsError } = await supabase
    .from("broadcast_poll_options")
    .select("id, broadcast_id, label, position")
    .eq("broadcast_id", broadcastId)
    .order("position", { ascending: true });

  if (optionsError) {
    throw new Error(`Failed to get poll results: ${optionsError.message}`);
  }

  const options = (optionRows ?? []) as Tables<"broadcast_poll_options">[];

  // Query 2: all votes for this broadcast
  const { data: voteRows, error: votesError } = await supabase
    .from("broadcast_poll_votes")
    .select("id, broadcast_id, option_id, user_id")
    .eq("broadcast_id", broadcastId);

  if (votesError) {
    throw new Error(`Failed to get poll votes: ${votesError.message}`);
  }

  const votes = (voteRows ?? []) as Tables<"broadcast_poll_votes">[];

  // Aggregate votes per option in memory
  const voteCountMap = new Map<string, number>();
  let myVotedOptionId: string | null = null;

  for (const vote of votes) {
    voteCountMap.set(vote.option_id, (voteCountMap.get(vote.option_id) ?? 0) + 1);
    if (currentUserId && vote.user_id === currentUserId) {
      myVotedOptionId = vote.option_id;
    }
  }

  return {
    broadcastId,
    options: options.map((opt) => ({
      optionId: opt.id,
      label: opt.label,
      voteCount: voteCountMap.get(opt.id) ?? 0,
      myVote: myVotedOptionId === opt.id,
    })),
    myVotedOptionId,
  };
}
