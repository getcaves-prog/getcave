/**
 * Integration tests for the Phase 1 community data-model RPCs and RLS.
 *
 * These hit a REAL local Supabase stack. They are SKIPPED unless the local
 * Supabase env is provided, so the default `pnpm test` run stays green even
 * without Docker.
 *
 * To run them:
 *   1. `pnpm db:start` then `pnpm db:reset` (applies all migrations locally)
 *   2. Export the local service-role + anon keys printed by `supabase status`:
 *        export SUPABASE_TEST_URL="http://127.0.0.1:54321"
 *        export SUPABASE_TEST_ANON_KEY="<anon key>"
 *        export SUPABASE_TEST_SERVICE_ROLE_KEY="<service_role key>"
 *   3. `pnpm test src/features/community`
 *
 * What they assert (per the approved design):
 *   - create_community inserts the community AND an 'owner' membership row.
 *   - get_or_create_conversation is idempotent (same row on second call).
 *   - flyer_attendance_counts counts total attendees and solo-goers correctly.
 *   - RLS: a non-admin user CANNOT post a broadcast to a community.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database.types";

const URL = process.env.SUPABASE_TEST_URL;
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

const hasLocalDb = Boolean(URL && ANON_KEY && SERVICE_ROLE_KEY);

// Guard: skip the whole suite when no local DB env is configured.
const describeIntegration = hasLocalDb ? describe : describe.skip;

type DB = Database;

async function createUser(
  admin: SupabaseClient<DB>,
): Promise<{ id: string; client: SupabaseClient<DB> }> {
  const email = `test-${crypto.randomUUID()}@caves.test`;
  const password = "test-password-123";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("user_creation_failed");

  const client = createClient<DB>(URL!, ANON_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      // Unique storageKey per user: without it, multiple anon clients in Node
      // share a single auth session, so auth.uid() bleeds across users and RLS
      // rejects the "wrong" user's inserts. This isolates each test session.
      storageKey: `test-auth-${data.user.id}`,
    },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  return { id: data.user.id, client };
}

describeIntegration("community data-model RPCs (local Supabase)", () => {
  let admin: SupabaseClient<DB>;

  beforeAll(() => {
    admin = createClient<DB>(URL!, SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  it("create_community creates the community and an owner membership", async () => {
    const owner = await createUser(admin);
    const slug = `band-${crypto.randomUUID().slice(0, 8)}`;

    const { data: community, error } = await owner.client.rpc(
      "create_community",
      { p_slug: slug, p_name: "Test Band" },
    );

    expect(error).toBeNull();
    expect(community).toBeTruthy();
    expect(community!.slug).toBe(slug);
    expect(community!.created_by).toBe(owner.id);
    expect(community!.member_count).toBe(1); // synced by trigger

    const { data: members } = await admin
      .from("community_members")
      .select("user_id, role")
      .eq("community_id", community!.id);

    expect(members).toEqual([{ user_id: owner.id, role: "owner" }]);
  });

  it("get_or_create_conversation is idempotent", async () => {
    const owner = await createUser(admin);
    const slug = `venue-${crypto.randomUUID().slice(0, 8)}`;
    const { data: community } = await owner.client.rpc("create_community", {
      p_slug: slug,
      p_name: "Test Venue",
    });

    const first = await owner.client.rpc("get_or_create_conversation", {
      p_subject_type: "community",
      p_subject_id: community!.id,
    });
    const second = await owner.client.rpc("get_or_create_conversation", {
      p_subject_type: "community",
      p_subject_id: community!.id,
    });

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data!.id).toBe(second.data!.id);
  });

  it("flyer_attendance_counts counts total and solo attendees", async () => {
    // Seed a flyer directly via service role.
    const { data: flyer } = await admin
      .from("flyers")
      .insert({ image_url: "https://example.test/f.png" })
      .select("id")
      .single();

    const u1 = await createUser(admin);
    const u2 = await createUser(admin);

    await u1.client
      .from("event_attendance")
      .insert({ flyer_id: flyer!.id, user_id: u1.id, going_solo: true });
    await u2.client
      .from("event_attendance")
      .insert({ flyer_id: flyer!.id, user_id: u2.id, going_solo: false });

    const { data, error } = await admin.rpc("flyer_attendance_counts", {
      p_flyer_id: flyer!.id,
    });

    expect(error).toBeNull();
    expect(data![0].total_count).toBe(2);
    expect(data![0].solo_count).toBe(1);
  });

  it("RLS: a non-admin user cannot post a broadcast", async () => {
    const owner = await createUser(admin);
    const slug = `coll-${crypto.randomUUID().slice(0, 8)}`;
    const { data: community } = await owner.client.rpc("create_community", {
      p_slug: slug,
      p_name: "Test Collective",
    });

    // A different user who is NOT a member/admin tries to broadcast.
    const stranger = await createUser(admin);
    const { error } = await stranger.client.from("broadcasts").insert({
      community_id: community!.id,
      author_id: stranger.id,
      body: "spam announcement",
    });

    // RLS policy "Admins create broadcasts" must reject this insert.
    expect(error).not.toBeNull();
  });

  it("RLS: authenticated user can insert a message with their own author_id (RLS passes)", async () => {
    // Create a community — this auto-creates a default 'General' channel.
    const owner = await createUser(admin);
    const slug = `chat-rls-${crypto.randomUUID().slice(0, 8)}`;
    const { data: community, error: communityError } = await owner.client.rpc(
      "create_community",
      { p_slug: slug, p_name: "Chat RLS Test" },
    );
    expect(communityError).toBeNull();
    expect(community).toBeTruthy();

    // Find the default General channel seeded by create_community.
    const { data: channels, error: channelsError } = await admin
      .from("community_channels")
      .select("id, name, is_default")
      .eq("community_id", community!.id)
      .eq("is_default", true)
      .limit(1);
    expect(channelsError).toBeNull();
    expect(channels).toHaveLength(1);
    const channelId = channels![0].id;

    // Get or create the conversation for this channel.
    const { data: conversation, error: convError } = await owner.client.rpc(
      "get_or_create_conversation",
      { p_subject_type: "channel", p_subject_id: channelId },
    );
    expect(convError).toBeNull();
    expect(conversation).toBeTruthy();
    const conversationId = conversation!.id;

    // Insert a message with the correct author_id — RLS MUST allow this.
    const { data: msg, error: insertError } = await owner.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        author_id: owner.id,
        body: "Hola desde el test de integración",
      })
      .select("id, author_id, body")
      .single();

    expect(insertError).toBeNull();
    expect(msg).toBeTruthy();
    expect(msg!.author_id).toBe(owner.id);
    expect(msg!.body).toBe("Hola desde el test de integración");
  });

  it("RLS: inserting a message with a DIFFERENT author_id fails (RLS rejects spoofed identity)", async () => {
    // Create community and get a channel conversation as before.
    const owner = await createUser(admin);
    const attacker = await createUser(admin);
    const slug = `spoof-${crypto.randomUUID().slice(0, 8)}`;
    const { data: community } = await owner.client.rpc("create_community", {
      p_slug: slug,
      p_name: "Spoof Test Community",
    });

    const { data: channels } = await admin
      .from("community_channels")
      .select("id")
      .eq("community_id", community!.id)
      .eq("is_default", true)
      .limit(1);
    const channelId = channels![0].id;

    const { data: conversation } = await owner.client.rpc(
      "get_or_create_conversation",
      { p_subject_type: "channel", p_subject_id: channelId },
    );
    const conversationId = conversation!.id;

    // Attacker attempts to post a message claiming it came from the owner.
    // RLS policy `author_id = auth.uid()` must reject this.
    const { error: spoofError } = await attacker.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        author_id: owner.id, // spoofed — does NOT match attacker's auth.uid()
        body: "Esto no soy yo",
      });

    expect(spoofError).not.toBeNull();
  });
});
