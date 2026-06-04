import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getOrCreateChannelConversation,
} from "./channels.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Test data ─────────────────────────────────────────────────────────────
const mockChannel = {
  id: "ch-1",
  community_id: "comm-1",
  name: "General",
  description: null,
  write_permission: "everyone",
  is_default: true,
  position: 0,
  created_by: "user-1",
  created_at: "2026-06-04T00:00:00Z",
  updated_at: "2026-06-04T00:00:00Z",
};

const mockChannel2 = {
  id: "ch-2",
  community_id: "comm-1",
  name: "Anuncios",
  description: "Solo admins",
  write_permission: "admins_only",
  is_default: false,
  position: 1,
  created_by: "user-1",
  created_at: "2026-06-04T01:00:00Z",
  updated_at: "2026-06-04T01:00:00Z",
};

// ─── listChannels ──────────────────────────────────────────────────────────
describe("listChannels", () => {
  beforeEach(() => {
    // from().select().eq("community_id").order()
    mockOrder.mockResolvedValue({ data: [mockChannel, mockChannel2], error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("queries community_channels filtered by community_id ordered by position asc", async () => {
    const result = await listChannels("comm-1");

    expect(mockFrom).toHaveBeenCalledWith("community_channels");
    expect(mockEq).toHaveBeenCalledWith("community_id", "comm-1");
    expect(mockOrder).toHaveBeenCalledWith("position", { ascending: true });
    expect(result).toHaveLength(2);
  });

  it("returns channels ordered by position — first channel has position 0", async () => {
    const result = await listChannels("comm-1");

    expect(result[0].position).toBe(0);
    expect(result[1].position).toBe(1);
  });

  it("returns empty array when no channels found", async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });

    const result = await listChannels("comm-1");

    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: "DB error" } });

    await expect(listChannels("comm-1")).rejects.toThrow("Failed to list channels: DB error");
  });
});

// ─── createChannel ─────────────────────────────────────────────────────────
describe("createChannel", () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockSingle.mockResolvedValue({ data: mockChannel, error: null });
    mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("inserts a channel and returns the created row", async () => {
    const result = await createChannel("comm-1", { name: "General" });

    expect(mockFrom).toHaveBeenCalledWith("community_channels");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        community_id: "comm-1",
        name: "General",
        created_by: "user-1",
      })
    );
    expect(result.name).toBe("General");
  });

  it("passes description and write_permission when provided", async () => {
    await createChannel("comm-1", {
      name: "Anuncios",
      description: "Solo admins",
      write_permission: "admins_only",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Anuncios",
        description: "Solo admins",
        write_permission: "admins_only",
      })
    );
  });

  it("throws validation error for empty name WITHOUT hitting the network", async () => {
    await expect(createChannel("comm-1", { name: "" })).rejects.toThrow("name");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws validation error for whitespace-only name WITHOUT hitting the network", async () => {
    await expect(createChannel("comm-1", { name: "   " })).rejects.toThrow("name");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(createChannel("comm-1", { name: "test" })).rejects.toThrow(
      "Tenés que iniciar sesión"
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "RLS denied" } });

    await expect(createChannel("comm-1", { name: "General" })).rejects.toThrow(
      "Failed to create channel: RLS denied"
    );
  });
});

// ─── updateChannel ─────────────────────────────────────────────────────────
describe("updateChannel", () => {
  const updatedChannel = { ...mockChannel, name: "Sala General", position: 2 };

  beforeEach(() => {
    mockSingle.mockResolvedValue({ data: updatedChannel, error: null });
    // from().update().eq().select().single()
    const mockSelectAfterUpdate = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqAfterUpdate = vi.fn().mockReturnValue({ select: mockSelectAfterUpdate });
    mockUpdate.mockReturnValue({ eq: mockEqAfterUpdate });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it("updates the channel and returns the updated row", async () => {
    const result = await updateChannel("ch-1", { name: "Sala General", position: 2 });

    expect(mockFrom).toHaveBeenCalledWith("community_channels");
    expect(mockUpdate).toHaveBeenCalledWith({ name: "Sala General", position: 2 });
    expect(result.name).toBe("Sala General");
    expect(result.position).toBe(2);
  });

  it("only passes provided fields to update (partial update)", async () => {
    await updateChannel("ch-1", { write_permission: "admins_only" });

    expect(mockUpdate).toHaveBeenCalledWith({ write_permission: "admins_only" });
  });

  it("throws on Supabase error", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "Not found" } });

    await expect(updateChannel("ch-1", { name: "X" })).rejects.toThrow(
      "Failed to update channel: Not found"
    );
  });
});

// ─── deleteChannel ─────────────────────────────────────────────────────────
describe("deleteChannel", () => {
  beforeEach(() => {
    // from().delete().eq()
    mockEq.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });
  });

  it("deletes the channel by id", async () => {
    await deleteChannel("ch-1");

    expect(mockFrom).toHaveBeenCalledWith("community_channels");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "ch-1");
  });

  it("throws on Supabase error", async () => {
    mockEq.mockResolvedValue({ error: { message: "RLS denied" } });

    await expect(deleteChannel("ch-1")).rejects.toThrow("Failed to delete channel: RLS denied");
  });
});

// ─── getOrCreateChannelConversation ────────────────────────────────────────
describe("getOrCreateChannelConversation", () => {
  const mockConversation = {
    id: "conv-1",
    subject_type: "channel",
    subject_id: "ch-1",
    created_at: "2026-06-04T00:00:00Z",
  };

  beforeEach(() => {
    mockRpc.mockResolvedValue({ data: mockConversation, error: null });
  });

  it("calls get_or_create_conversation RPC with subject_type='channel'", async () => {
    const result = await getOrCreateChannelConversation("ch-1");

    expect(mockRpc).toHaveBeenCalledWith("get_or_create_conversation", {
      p_subject_type: "channel",
      p_subject_id: "ch-1",
    });
    expect(result.subject_type).toBe("channel");
    expect(result.subject_id).toBe("ch-1");
  });

  it("throws on RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "subject_not_found" } });

    await expect(getOrCreateChannelConversation("ch-1")).rejects.toThrow(
      "Failed to get or create channel conversation: subject_not_found"
    );
  });
});
