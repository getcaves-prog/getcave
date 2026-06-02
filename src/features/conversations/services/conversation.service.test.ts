import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOrCreateConversation,
  listMessages,
  postMessage,
  softDeleteMessage,
  groupByThread,
} from "./conversation.service";
import type { MessageWithAuthor } from "../types/conversation.types";
import { ReplyDepthError } from "../types/conversation.types";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockIn = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Default chain for from().select().eq().order().limit()
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockEq.mockReturnValue({ order: mockOrder, eq: mockEq, limit: mockLimit });
  // in() for profiles batch query
  mockIn.mockResolvedValue({ data: [], error: null });
  mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, in: mockIn });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate });
});

// ─── getOrCreateConversation ───────────────────────────────────────────────
describe("getOrCreateConversation", () => {
  it("calls RPC with correct arg names and returns the conversation row", async () => {
    const mockConv = {
      id: "conv-1",
      subject_type: "flyer",
      subject_id: "flyer-1",
      created_at: "2026-06-01T00:00:00Z",
    };
    mockRpc.mockResolvedValue({ data: mockConv, error: null });

    const result = await getOrCreateConversation("flyer", "flyer-1");

    expect(mockRpc).toHaveBeenCalledWith("get_or_create_conversation", {
      p_subject_type: "flyer",
      p_subject_id: "flyer-1",
    });
    expect(result.id).toBe("conv-1");
    expect(result.subject_type).toBe("flyer");
  });

  it("also works for community subject type", async () => {
    const mockConv = {
      id: "conv-2",
      subject_type: "community",
      subject_id: "comm-1",
      created_at: "2026-06-01T00:00:00Z",
    };
    mockRpc.mockResolvedValue({ data: mockConv, error: null });

    const result = await getOrCreateConversation("community", "comm-1");

    expect(mockRpc).toHaveBeenCalledWith("get_or_create_conversation", {
      p_subject_type: "community",
      p_subject_id: "comm-1",
    });
    expect(result.subject_type).toBe("community");
  });

  it("throws a descriptive error when RPC fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC error" } });

    await expect(getOrCreateConversation("flyer", "flyer-1")).rejects.toThrow(
      "Failed to get or create conversation: RPC error"
    );
  });
});

// ─── listMessages ──────────────────────────────────────────────────────────
// Implementation uses 2 queries: messages flat + batch profiles by in().
// The mock must handle both from("messages") and from("profiles") calls.
describe("listMessages", () => {
  const flatMessages = [
    {
      id: "msg-1",
      conversation_id: "conv-1",
      parent_message_id: null,
      body: "Hola!",
      is_deleted: false,
      created_at: "2026-06-01T10:00:00Z",
      updated_at: "2026-06-01T10:00:00Z",
      author_id: "user-1",
    },
    {
      id: "msg-2",
      conversation_id: "conv-1",
      parent_message_id: "msg-1",
      body: "Qué onda",
      is_deleted: false,
      created_at: "2026-06-01T10:05:00Z",
      updated_at: "2026-06-01T10:05:00Z",
      author_id: "user-2",
    },
  ];

  const profilesData = [
    { id: "user-1", username: "juan", avatar_url: null },
    { id: "user-2", username: "maria", avatar_url: "https://x.com/av.jpg" },
  ];

  function setupMessagesChain(
    messagesResult: { data: unknown; error: unknown },
    profilesResult: { data: unknown; error: unknown } = { data: profilesData, error: null }
  ) {
    // from("messages") → select().eq().order().limit()
    // from("profiles") → select().in()
    mockFrom.mockImplementation((table: string) => {
      if (table === "messages") {
        const mockLimitMsg = vi.fn().mockResolvedValue(messagesResult);
        const mockOrderMsg = vi.fn().mockReturnValue({ limit: mockLimitMsg });
        const mockEqMsg = vi.fn().mockReturnValue({ order: mockOrderMsg });
        const mockSelectMsg = vi.fn().mockReturnValue({ eq: mockEqMsg });
        return { select: mockSelectMsg };
      }
      if (table === "profiles") {
        const mockInProfiles = vi.fn().mockResolvedValue(profilesResult);
        const mockSelectProfiles = vi.fn().mockReturnValue({ in: mockInProfiles });
        return { select: mockSelectProfiles };
      }
      return { select: mockSelect };
    });
  }

  it("queries messages table flat then batch-fetches profiles", async () => {
    setupMessagesChain({ data: flatMessages, error: null });

    await listMessages("conv-1");

    // First call must be "messages"
    expect(mockFrom.mock.calls[0][0]).toBe("messages");
    // Second call must be "profiles"
    expect(mockFrom.mock.calls[1][0]).toBe("profiles");
  });

  it("maps flat rows + profiles to MessageWithAuthor shape", async () => {
    setupMessagesChain({ data: flatMessages, error: null });

    const result = await listMessages("conv-1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("msg-1");
    expect(result[0].body).toBe("Hola!");
    expect(result[0].is_deleted).toBe(false);
    expect(result[0].author).toEqual({
      id: "user-1",
      username: "juan",
      avatar_url: null,
    });
    expect(result[1].parent_message_id).toBe("msg-1");
    expect(result[1].author?.username).toBe("maria");
  });

  it("nulls the body for soft-deleted messages", async () => {
    const deletedRows = [
      {
        id: "msg-3",
        conversation_id: "conv-1",
        parent_message_id: null,
        body: "contenido eliminado",
        is_deleted: true,
        created_at: "2026-06-01T11:00:00Z",
        updated_at: "2026-06-01T11:30:00Z",
        author_id: "user-1",
      },
    ];
    setupMessagesChain(
      { data: deletedRows, error: null },
      { data: [{ id: "user-1", username: "juan", avatar_url: null }], error: null }
    );

    const result = await listMessages("conv-1");

    expect(result[0].is_deleted).toBe(true);
    expect(result[0].body).toBeNull();
  });

  it("sets author to null when author_id is null (deleted user)", async () => {
    const noAuthorRows = [
      {
        id: "msg-4",
        conversation_id: "conv-1",
        parent_message_id: null,
        body: "mensaje de usuario eliminado",
        is_deleted: false,
        created_at: "2026-06-01T12:00:00Z",
        updated_at: "2026-06-01T12:00:00Z",
        author_id: null,
      },
    ];
    // No profiles query because authorIds is empty
    setupMessagesChain({ data: noAuthorRows, error: null }, { data: [], error: null });

    const result = await listMessages("conv-1");

    expect(result[0].author).toBeNull();
  });

  it("throws on Supabase error from messages query", async () => {
    setupMessagesChain({ data: null, error: { message: "DB error" } });

    await expect(listMessages("conv-1")).rejects.toThrow(
      "Failed to list messages: DB error"
    );
  });

  it("returns empty array when data is null without error", async () => {
    setupMessagesChain({ data: null, error: null });

    const result = await listMessages("conv-1");

    expect(result).toEqual([]);
  });
});

// ─── postMessage ───────────────────────────────────────────────────────────
describe("postMessage", () => {
  const mockInsertedMessage = {
    id: "msg-new",
    conversation_id: "conv-1",
    parent_message_id: null,
    body: "Nuevo mensaje",
    is_deleted: false,
    created_at: "2026-06-01T13:00:00Z",
    updated_at: "2026-06-01T13:00:00Z",
    author_id: "user-1",
  };

  beforeEach(() => {
    // for postMessage: from().insert().select().single()
    mockSingle.mockResolvedValue({ data: mockInsertedMessage, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("inserts message with correct fields and returns the row", async () => {
    const result = await postMessage("conv-1", "Nuevo mensaje");

    expect(mockFrom).toHaveBeenCalledWith("messages");
    expect(mockInsert).toHaveBeenCalledWith({
      conversation_id: "conv-1",
      body: "Nuevo mensaje",
      parent_message_id: undefined,
    });
    expect(result.id).toBe("msg-new");
  });

  it("passes parentMessageId when provided", async () => {
    mockSingle.mockResolvedValue({
      data: { ...mockInsertedMessage, parent_message_id: "msg-parent" },
      error: null,
    });

    await postMessage("conv-1", "Respuesta", "msg-parent");

    expect(mockInsert).toHaveBeenCalledWith({
      conversation_id: "conv-1",
      body: "Respuesta",
      parent_message_id: "msg-parent",
    });
  });

  it("rejects empty body WITHOUT hitting the network", async () => {
    await expect(postMessage("conv-1", "")).rejects.toThrow();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only body WITHOUT hitting the network", async () => {
    await expect(postMessage("conv-1", "   ")).rejects.toThrow();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects body longer than 2000 chars WITHOUT hitting the network", async () => {
    const longBody = "a".repeat(2001);
    await expect(postMessage("conv-1", longBody)).rejects.toThrow();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("accepts body of exactly 2000 chars", async () => {
    const exactBody = "a".repeat(2000);
    await postMessage("conv-1", exactBody);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("maps the Postgres trigger error to ReplyDepthError", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "replies_limited_to_one_level" },
    });

    await expect(postMessage("conv-1", "Hola", "msg-parent")).rejects.toBeInstanceOf(
      ReplyDepthError
    );
  });

  it("throws a generic error for other DB errors", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Foreign key violation" },
    });

    await expect(postMessage("conv-1", "Hola")).rejects.toThrow(
      "Failed to post message: Foreign key violation"
    );
  });
});

// ─── softDeleteMessage ─────────────────────────────────────────────────────
describe("softDeleteMessage", () => {
  const mockUpdateEq = vi.fn();

  beforeEach(() => {
    // from().update().eq()
    mockUpdateEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it("updates is_deleted to true on the correct message", async () => {
    await softDeleteMessage("msg-1");

    expect(mockFrom).toHaveBeenCalledWith("messages");
    expect(mockUpdate).toHaveBeenCalledWith({ is_deleted: true });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "msg-1");
  });

  it("throws on Supabase error", async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: "RLS denied" } });

    await expect(softDeleteMessage("msg-1")).rejects.toThrow(
      "Failed to delete message: RLS denied"
    );
  });
});

// ─── groupByThread helper ──────────────────────────────────────────────────
describe("groupByThread", () => {
  const makeMsg = (
    id: string,
    parent: string | null = null
  ): MessageWithAuthor => ({
    id,
    conversation_id: "conv-1",
    parent_message_id: parent,
    body: "msg",
    is_deleted: false,
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
    author: null,
  });

  it("nests replies under their parent message", () => {
    const messages = [
      makeMsg("root-1"),
      makeMsg("reply-1", "root-1"),
      makeMsg("reply-2", "root-1"),
      makeMsg("root-2"),
    ];

    const threads = groupByThread(messages);

    expect(threads).toHaveLength(2);
    expect(threads[0].id).toBe("root-1");
    expect(threads[0].replies).toHaveLength(2);
    expect(threads[0].replies[0].id).toBe("reply-1");
    expect(threads[0].replies[1].id).toBe("reply-2");
    expect(threads[1].id).toBe("root-2");
    expect(threads[1].replies).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(groupByThread([])).toEqual([]);
  });

  it("handles orphan replies (parent not in list) by attaching to root level", () => {
    const messages = [makeMsg("reply-orphan", "nonexistent-parent")];
    const threads = groupByThread(messages);
    // Orphan reply surfaced as root — doesn't crash
    expect(threads).toHaveLength(1);
    expect(threads[0].replies).toHaveLength(0);
  });
});
