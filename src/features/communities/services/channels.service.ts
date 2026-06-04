import { createClient } from "@/shared/lib/supabase/client";
import type { Tables } from "@/shared/types/database.types";
import type {
  CommunityChannel,
  CreateChannelInput,
  UpdateChannelInput,
} from "../types/community.types";

type Conversation = Tables<"conversations">;

// ─── listChannels ──────────────────────────────────────────────────────────
// Returns all channels for a community, ordered by position ascending.
// Channels are publicly readable (RLS SELECT public).
export async function listChannels(communityId: string): Promise<CommunityChannel[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("community_channels")
    .select("*")
    .eq("community_id", communityId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Failed to list channels: ${error.message}`);
  }

  return (data ?? []) as CommunityChannel[];
}

// ─── createChannel ─────────────────────────────────────────────────────────
// Inserts a new channel in the community. Resolves the current user for
// created_by. RLS INSERT policy enforces owner/admin role on the community.
export async function createChannel(
  communityId: string,
  input: CreateChannelInput
): Promise<CommunityChannel> {
  const name = input.name?.trim();

  if (!name) {
    throw new Error("El campo name no puede estar vacío.");
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Tenés que iniciar sesión para crear un canal.");
  }

  const { data, error } = await supabase
    .from("community_channels")
    .insert({
      community_id: communityId,
      name,
      description: input.description,
      write_permission: input.write_permission ?? "everyone",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create channel: ${error.message}`);
  }

  return data as CommunityChannel;
}

// ─── updateChannel ─────────────────────────────────────────────────────────
// Partially updates a channel. Only provided fields are sent to Supabase
// (undefined fields are omitted by the JS client). RLS UPDATE policy enforces
// owner/admin role on the channel's community.
export async function updateChannel(
  channelId: string,
  input: UpdateChannelInput
): Promise<CommunityChannel> {
  const supabase = createClient();

  // Build a plain object with only the defined keys so the Supabase client
  // doesn't send null for omitted optional fields.
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.write_permission !== undefined) patch.write_permission = input.write_permission;
  if (input.position !== undefined) patch.position = input.position;
  if (input.is_default !== undefined) patch.is_default = input.is_default;

  const { data, error } = await supabase
    .from("community_channels")
    .update(patch)
    .eq("id", channelId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update channel: ${error.message}`);
  }

  return data as CommunityChannel;
}

// ─── deleteChannel ─────────────────────────────────────────────────────────
// Deletes a channel by id. RLS DELETE policy enforces owner/admin role.
// Cascades to conversations + messages via ON DELETE CASCADE on the FK chain:
//   community_channels -> conversations (subject_id) handled at app layer;
//   actual cascade is on messages -> conversations.
export async function deleteChannel(channelId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("community_channels")
    .delete()
    .eq("id", channelId);

  if (error) {
    throw new Error(`Failed to delete channel: ${error.message}`);
  }
}

// ─── getOrCreateChannelConversation ────────────────────────────────────────
// Calls the SECURITY DEFINER RPC get_or_create_conversation with
// subject_type='channel'. The RPC validates the channel exists in
// community_channels before creating or returning the conversation row.
export async function getOrCreateChannelConversation(
  channelId: string
): Promise<Conversation> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_subject_type: "channel",
    p_subject_id: channelId,
  });

  if (error) {
    throw new Error(`Failed to get or create channel conversation: ${error.message}`);
  }

  return data as Conversation;
}
