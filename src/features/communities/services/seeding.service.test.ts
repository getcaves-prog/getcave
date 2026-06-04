import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSeededCommunity,
  transferOwnership,
  postOfficialMessage,
} from "./seeding.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockRpc = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────
const baseCommunity = {
  id: "comm-seed-1",
  slug: "fb-cumbia-crew",
  name: "Cumbia Crew",
  description: "Imported from Facebook",
  avatar_url: null,
  cover_url: null,
  city: "Buenos Aires",
  zone_id: null,
  created_by: "admin-user-1",
  member_count: 1,
  is_seeded: false,
  source_platform: null,
  source_url: null,
  claimed_by: null,
  claimed_at: null,
  created_at: "2026-06-04T00:00:00Z",
  updated_at: "2026-06-04T00:00:00Z",
};

const seededCommunity = {
  ...baseCommunity,
  is_seeded: true,
  source_platform: "facebook",
  source_url: "https://fb.com/groups/cumbia-crew",
};

// ─── createSeededCommunity ─────────────────────────────────────────────────
describe("createSeededCommunity", () => {
  it("calls create_community then update_community_seeded_flags", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: baseCommunity, error: null })
      .mockResolvedValueOnce({ data: seededCommunity, error: null });

    const result = await createSeededCommunity({
      slug: "fb-cumbia-crew",
      name: "Cumbia Crew",
      description: "Imported from Facebook",
      city: "Buenos Aires",
      sourcePlatform: "facebook",
      sourceUrl: "https://fb.com/groups/cumbia-crew",
    });

    expect(mockRpc).toHaveBeenNthCalledWith(1, "create_community", {
      p_slug: "fb-cumbia-crew",
      p_name: "Cumbia Crew",
      p_description: "Imported from Facebook",
      p_avatar_url: undefined,
      p_cover_url: undefined,
      p_city: "Buenos Aires",
      p_zone_id: undefined,
    });

    expect(mockRpc).toHaveBeenNthCalledWith(2, "update_community_seeded_flags", {
      p_community_id: "comm-seed-1",
      p_is_seeded: true,
      p_source_platform: "facebook",
      p_source_url: "https://fb.com/groups/cumbia-crew",
    });

    expect(result.is_seeded).toBe(true);
    expect(result.source_platform).toBe("facebook");
  });

  it("works without optional seeded metadata", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: baseCommunity, error: null })
      .mockResolvedValueOnce({ data: { ...baseCommunity, is_seeded: true }, error: null });

    await createSeededCommunity({ slug: "bare-seed", name: "Bare Seed" });

    expect(mockRpc).toHaveBeenNthCalledWith(2, "update_community_seeded_flags", {
      p_community_id: "comm-seed-1",
      p_is_seeded: true,
      p_source_platform: undefined,
      p_source_url: undefined,
    });
  });

  it("throws validation error for empty slug", async () => {
    await expect(createSeededCommunity({ slug: "", name: "Valid" })).rejects.toThrow("slug");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throws validation error for empty name", async () => {
    await expect(createSeededCommunity({ slug: "ok", name: "" })).rejects.toThrow("name");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throws on create_community failure", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Slug already taken" },
    });

    await expect(
      createSeededCommunity({ slug: "fb-cumbia-crew", name: "Cumbia Crew" })
    ).rejects.toThrow("Failed to create seeded community: Slug already taken");
  });

  it("throws on seeded-flags update failure", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: baseCommunity, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "not_authorized" } });

    await expect(
      createSeededCommunity({ slug: "fb-cumbia-crew", name: "Cumbia Crew" })
    ).rejects.toThrow("Failed to set seeded flags: not_authorized");
  });
});


// ─── transferOwnership ─────────────────────────────────────────────────────
describe("transferOwnership", () => {
  const transferredCommunity = {
    ...baseCommunity,
    is_seeded: false,
    claimed_by: "new-owner-id",
    claimed_at: "2026-06-04T10:00:00Z",
    member_count: 3,
    updated_at: "2026-06-04T10:00:00Z",
  };

  it("calls transfer_community_ownership RPC with correct params", async () => {
    mockRpc.mockResolvedValue({ data: transferredCommunity, error: null });

    const result = await transferOwnership("comm-seed-1", "new-owner-id");

    expect(mockRpc).toHaveBeenCalledWith("transfer_community_ownership", {
      p_community_id: "comm-seed-1",
      p_new_owner: "new-owner-id",
    });
    expect(result.claimed_by).toBe("new-owner-id");
    expect(result.is_seeded).toBe(false);
  });

  it("throws on RPC error (not_authorized)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "not_authorized" } });

    await expect(transferOwnership("comm-seed-1", "user-x")).rejects.toThrow(
      "Failed to transfer ownership: not_authorized"
    );
  });

  it("throws on RPC error (community_not_found)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "community_not_found" } });

    await expect(transferOwnership("bad-id", "user-x")).rejects.toThrow(
      "Failed to transfer ownership: community_not_found"
    );
  });
});


// ─── postOfficialMessage ───────────────────────────────────────────────────
describe("postOfficialMessage", () => {
  const officialMessage = {
    id: "msg-off-1",
    conversation_id: "conv-1",
    author_id: "admin-user-1",
    parent_message_id: null,
    body: "Welcome to this community! 🎵",
    is_official: true,
    is_deleted: false,
    created_at: "2026-06-04T00:00:00Z",
    updated_at: "2026-06-04T00:00:00Z",
  };

  it("calls post_seeded_message RPC with correct params", async () => {
    mockRpc.mockResolvedValue({ data: officialMessage, error: null });

    const result = await postOfficialMessage(
      "community",
      "comm-seed-1",
      "Welcome to this community! 🎵"
    );

    expect(mockRpc).toHaveBeenCalledWith("post_seeded_message", {
      p_subject_type: "community",
      p_subject_id: "comm-seed-1",
      p_body: "Welcome to this community! 🎵",
    });
    expect(result.is_official).toBe(true);
    expect(result.body).toBe("Welcome to this community! 🎵");
  });

  it("works with 'channel' subject_type", async () => {
    mockRpc.mockResolvedValue({ data: { ...officialMessage, body: "This is an admin-only channel." }, error: null });

    await postOfficialMessage("channel", "chan-1", "This is an admin-only channel.");

    expect(mockRpc).toHaveBeenCalledWith("post_seeded_message", {
      p_subject_type: "channel",
      p_subject_id: "chan-1",
      p_body: "This is an admin-only channel.",
    });
  });

  it("works with 'flyer' subject_type", async () => {
    mockRpc.mockResolvedValue({ data: { ...officialMessage, body: "Event details here." }, error: null });

    await postOfficialMessage("flyer", "flyer-1", "Event details here.");

    expect(mockRpc).toHaveBeenCalledWith("post_seeded_message", {
      p_subject_type: "flyer",
      p_subject_id: "flyer-1",
      p_body: "Event details here.",
    });
  });

  it("throws validation error for empty body", async () => {
    await expect(
      postOfficialMessage("community", "comm-1", "")
    ).rejects.toThrow("body");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throws validation error for whitespace-only body", async () => {
    await expect(
      postOfficialMessage("community", "comm-1", "   ")
    ).rejects.toThrow("body");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throws on RPC error (not_authorized)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "not_authorized" } });

    await expect(
      postOfficialMessage("community", "comm-1", "Hello")
    ).rejects.toThrow("Failed to post official message: not_authorized");
  });

  it("throws on RPC error (subject_not_found)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "subject_not_found" } });

    await expect(
      postOfficialMessage("community", "bad-id", "Hello")
    ).rejects.toThrow("Failed to post official message: subject_not_found");
  });
});
