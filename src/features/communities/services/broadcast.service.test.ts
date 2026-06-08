import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listBroadcasts,
  createBroadcast,
  createPoll,
  votePoll,
  getPollResults,
  getActivePoll,
} from "./broadcast.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockSingle = vi.fn();
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
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

// ─── listBroadcasts ────────────────────────────────────────────────────────
describe("listBroadcasts", () => {
  const mockBroadcasts = [
    {
      id: "b1",
      community_id: "comm-1",
      author_id: "user-1",
      kind: "announcement",
      title: "Party tonight",
      body: "Doors open at 22:00",
      metadata: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    mockLimit.mockResolvedValue({ data: mockBroadcasts, error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("queries broadcasts by community_id ordered by created_at desc", async () => {
    const result = await listBroadcasts("comm-1");

    expect(mockFrom).toHaveBeenCalledWith("broadcasts");
    expect(mockEq).toHaveBeenCalledWith("community_id", "comm-1");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("announcement");
  });

  it("returns empty array when data is null without error", async () => {
    mockLimit.mockResolvedValue({ data: null, error: null });

    const result = await listBroadcasts("comm-1");

    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: "DB error" } });

    await expect(listBroadcasts("comm-1")).rejects.toThrow(
      "Failed to list broadcasts: DB error"
    );
  });
});

// ─── createBroadcast ───────────────────────────────────────────────────────
describe("createBroadcast", () => {
  const mockInsertedBroadcast = {
    id: "b-new",
    community_id: "comm-1",
    author_id: "user-1",
    kind: "announcement",
    title: null,
    body: "Big news!",
    metadata: null,
    created_at: "2026-06-01T12:00:00Z",
    updated_at: "2026-06-01T12:00:00Z",
  };

  beforeEach(() => {
    mockSingle.mockResolvedValue({ data: mockInsertedBroadcast, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("inserts broadcast with author_id from current user", async () => {
    const result = await createBroadcast("comm-1", {
      kind: "announcement",
      body: "Big news!",
    });

    expect(mockFrom).toHaveBeenCalledWith("broadcasts");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        community_id: "comm-1",
        author_id: "user-1",
        kind: "announcement",
        body: "Big news!",
      })
    );
    expect(result.id).toBe("b-new");
  });

  it("includes title when provided", async () => {
    await createBroadcast("comm-1", {
      kind: "schedule_change",
      title: "Horario actualizado",
      body: "Ahora a las 23:00",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Horario actualizado" })
    );
  });

  it("includes metadata when provided", async () => {
    await createBroadcast("comm-1", {
      kind: "location_change",
      body: "Nuevo venue",
      metadata: { lat: -34.6, lng: -58.4 },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { lat: -34.6, lng: -58.4 } })
    );
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(
      createBroadcast("comm-1", { kind: "announcement", body: "spam" })
    ).rejects.toThrow("Tenés que iniciar sesión");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "RLS denied" } });

    await expect(
      createBroadcast("comm-1", { kind: "announcement", body: "Big news!" })
    ).rejects.toThrow("Failed to create broadcast: RLS denied");
  });
});

// ─── createPoll ────────────────────────────────────────────────────────────
describe("createPoll", () => {
  const mockBroadcast = {
    id: "poll-1",
    community_id: "comm-1",
    author_id: "user-1",
    kind: "poll",
    title: "Qué día prefieren?",
    body: "Votá",
    metadata: null,
    created_at: "2026-06-01T12:00:00Z",
    updated_at: "2026-06-01T12:00:00Z",
  };

  function setupCreatePollChain() {
    mockFrom.mockImplementation((table: string) => {
      if (table === "broadcasts") {
        const localSingle = vi.fn().mockResolvedValue({ data: mockBroadcast, error: null });
        const localSelect = vi.fn().mockReturnValue({ single: localSingle });
        const localInsert = vi.fn().mockReturnValue({ select: localSelect });
        return { insert: localInsert };
      }
      if (table === "broadcast_poll_options") {
        const localInsert = vi.fn().mockResolvedValue({ error: null });
        return { insert: localInsert };
      }
      return {};
    });
  }

  it("inserts broadcast kind='poll' then inserts poll options", async () => {
    setupCreatePollChain();

    const result = await createPoll("comm-1", {
      title: "Qué día prefieren?",
      body: "Votá",
      options: ["Viernes", "Sábado"],
    });

    expect(mockFrom.mock.calls[0][0]).toBe("broadcasts");
    expect(mockFrom.mock.calls[1][0]).toBe("broadcast_poll_options");
    expect(result.kind).toBe("poll");
  });

  it("inserts options with correct broadcast_id and positions", async () => {
    let capturedOptions: unknown = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === "broadcasts") {
        const localSingle = vi.fn().mockResolvedValue({ data: mockBroadcast, error: null });
        const localSelect = vi.fn().mockReturnValue({ single: localSingle });
        const localInsert = vi.fn().mockReturnValue({ select: localSelect });
        return { insert: localInsert };
      }
      if (table === "broadcast_poll_options") {
        const localInsert = vi.fn().mockImplementation((opts) => {
          capturedOptions = opts;
          return Promise.resolve({ error: null });
        });
        return { insert: localInsert };
      }
      return {};
    });

    await createPoll("comm-1", {
      body: "Vote",
      options: ["Opción A", "Opción B", "Opción C"],
    });

    expect(capturedOptions).toEqual([
      { broadcast_id: "poll-1", label: "Opción A", position: 0 },
      { broadcast_id: "poll-1", label: "Opción B", position: 1 },
      { broadcast_id: "poll-1", label: "Opción C", position: 2 },
    ]);
  });

  it("throws validation error for fewer than 2 options WITHOUT hitting network", async () => {
    await expect(
      createPoll("comm-1", { body: "Vote", options: ["Solo una"] })
    ).rejects.toThrow("options");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(
      createPoll("comm-1", { body: "Vote", options: ["A", "B"] })
    ).rejects.toThrow("Tenés que iniciar sesión");
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ─── votePoll ──────────────────────────────────────────────────────────────
describe("votePoll", () => {
  beforeEach(() => {
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("inserts a vote with current user id", async () => {
    await votePoll("broadcast-1", "opt-1");

    expect(mockFrom).toHaveBeenCalledWith("broadcast_poll_votes");
    expect(mockInsert).toHaveBeenCalledWith({
      broadcast_id: "broadcast-1",
      option_id: "opt-1",
      user_id: "user-1",
    });
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(votePoll("broadcast-1", "opt-1")).rejects.toThrow(
      "Tenés que iniciar sesión"
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    mockInsert.mockResolvedValue({ error: { message: "Already voted" } });

    await expect(votePoll("broadcast-1", "opt-1")).rejects.toThrow(
      "Failed to vote: Already voted"
    );
  });
});

// ─── getPollResults ────────────────────────────────────────────────────────
describe("getPollResults", () => {
  const optionRows = [
    { id: "opt-1", broadcast_id: "b1", label: "Viernes", position: 0 },
    { id: "opt-2", broadcast_id: "b1", label: "Sábado", position: 1 },
  ];

  const voteRows = [
    { id: "v1", broadcast_id: "b1", option_id: "opt-1", user_id: "user-2" },
    { id: "v2", broadcast_id: "b1", option_id: "opt-1", user_id: "user-3" },
    { id: "v3", broadcast_id: "b1", option_id: "opt-2", user_id: "user-1" }, // current user
  ];

  function setupGetPollResultsChain(
    optionsResult: { data: unknown; error: unknown },
    votesResult: { data: unknown; error: unknown }
  ) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "broadcast_poll_options") {
        const mockOrderOpts = vi.fn().mockResolvedValue(optionsResult);
        const mockEqOpts = vi.fn().mockReturnValue({ order: mockOrderOpts });
        const mockSelectOpts = vi.fn().mockReturnValue({ eq: mockEqOpts });
        return { select: mockSelectOpts };
      }
      if (table === "broadcast_poll_votes") {
        const mockEqVotes = vi.fn().mockResolvedValue(votesResult);
        const mockSelectVotes = vi.fn().mockReturnValue({ eq: mockEqVotes });
        return { select: mockSelectVotes };
      }
      return {};
    });
  }

  it("returns option labels with vote counts and myVote flag", async () => {
    setupGetPollResultsChain(
      { data: optionRows, error: null },
      { data: voteRows, error: null }
    );

    const result = await getPollResults("b1");

    expect(result.broadcastId).toBe("b1");
    expect(result.options).toHaveLength(2);

    const viernes = result.options.find((o) => o.label === "Viernes")!;
    expect(viernes.voteCount).toBe(2);
    expect(viernes.myVote).toBe(false);

    const sabado = result.options.find((o) => o.label === "Sábado")!;
    expect(sabado.voteCount).toBe(1);
    expect(sabado.myVote).toBe(true); // user-1 voted for sábado
  });

  it("sets myVotedOptionId to the option current user voted for", async () => {
    setupGetPollResultsChain(
      { data: optionRows, error: null },
      { data: voteRows, error: null }
    );

    const result = await getPollResults("b1");

    expect(result.myVotedOptionId).toBe("opt-2");
  });

  it("returns myVotedOptionId as null when user has not voted", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    setupGetPollResultsChain(
      { data: optionRows, error: null },
      { data: voteRows.slice(0, 2), error: null } // only non-user votes
    );

    const result = await getPollResults("b1");

    expect(result.myVotedOptionId).toBeNull();
  });

  it("throws on options query error", async () => {
    setupGetPollResultsChain(
      { data: null, error: { message: "DB error" } },
      { data: [], error: null }
    );

    await expect(getPollResults("b1")).rejects.toThrow(
      "Failed to get poll results: DB error"
    );
  });
});

// ─── createPoll with expiresAt ─────────────────────────────────────────────
describe("createPoll — expiresAt", () => {
  const mockBroadcast = {
    id: "poll-exp",
    community_id: "comm-1",
    author_id: "user-1",
    kind: "poll",
    title: "With deadline",
    body: "Vote before it closes",
    metadata: null,
    expires_at: "2026-06-15T00:00:00Z",
    created_at: "2026-06-08T12:00:00Z",
    updated_at: "2026-06-08T12:00:00Z",
  };

  it("passes expiresAt to the broadcasts insert payload", async () => {
    let capturedBroadcastInsert: unknown = null;

    mockFrom.mockImplementation((table: string) => {
      if (table === "broadcasts") {
        const localSingle = vi.fn().mockResolvedValue({ data: mockBroadcast, error: null });
        const localSelect = vi.fn().mockReturnValue({ single: localSingle });
        const localInsert = vi.fn().mockImplementation((payload) => {
          capturedBroadcastInsert = payload;
          return { select: localSelect };
        });
        return { insert: localInsert };
      }
      if (table === "broadcast_poll_options") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    await createPoll("comm-1", {
      body: "Vote before it closes",
      options: ["Option A", "Option B"],
      expiresAt: "2026-06-15T00:00:00Z",
    });

    expect(capturedBroadcastInsert).toMatchObject({
      expires_at: "2026-06-15T00:00:00Z",
    });
  });

  it("sends expires_at as null when expiresAt is omitted", async () => {
    let capturedBroadcastInsert: unknown = null;

    mockFrom.mockImplementation((table: string) => {
      if (table === "broadcasts") {
        const localSingle = vi.fn().mockResolvedValue({ data: mockBroadcast, error: null });
        const localSelect = vi.fn().mockReturnValue({ single: localSingle });
        const localInsert = vi.fn().mockImplementation((payload) => {
          capturedBroadcastInsert = payload;
          return { select: localSelect };
        });
        return { insert: localInsert };
      }
      if (table === "broadcast_poll_options") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    await createPoll("comm-1", {
      body: "No deadline",
      options: ["A", "B"],
    });

    expect(capturedBroadcastInsert).toMatchObject({ expires_at: null });
  });
});

// ─── getActivePoll ─────────────────────────────────────────────────────────
describe("getActivePoll", () => {
  const broadcastRow = {
    id: "poll-active",
    title: "Best night?",
    body: "Vote!",
    expires_at: null,
  };

  const optionRows = [
    { id: "opt-1", broadcast_id: "poll-active", label: "Viernes", position: 0 },
    { id: "opt-2", broadcast_id: "poll-active", label: "Sábado", position: 1 },
  ];

  const voteRows = [
    { id: "v1", broadcast_id: "poll-active", option_id: "opt-1", user_id: "user-2" },
    { id: "v2", broadcast_id: "poll-active", option_id: "opt-2", user_id: "user-1" },
  ];

  // Wires the three-query chain: broadcasts, options, votes
  function setupActivePoll(
    broadcastResult: { data: unknown; error: unknown },
    optionsResult = { data: optionRows, error: null } as { data: unknown; error: unknown },
    votesResult = { data: voteRows, error: null } as { data: unknown; error: unknown }
  ) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "broadcasts") {
        // select(...).eq(...).eq(...).or(...).order(...).limit(...)
        const mockLimitB = vi.fn().mockResolvedValue(broadcastResult);
        const mockOrderB = vi.fn().mockReturnValue({ limit: mockLimitB });
        const mockOrB = vi.fn().mockReturnValue({ order: mockOrderB });
        const mockEqKind = vi.fn().mockReturnValue({ or: mockOrB });
        const mockEqComm = vi.fn().mockReturnValue({ eq: mockEqKind });
        const mockSelectB = vi.fn().mockReturnValue({ eq: mockEqComm });
        return { select: mockSelectB };
      }
      if (table === "broadcast_poll_options") {
        const mockOrderOpts = vi.fn().mockResolvedValue(optionsResult);
        const mockEqOpts = vi.fn().mockReturnValue({ order: mockOrderOpts });
        const mockSelectOpts = vi.fn().mockReturnValue({ eq: mockEqOpts });
        return { select: mockSelectOpts };
      }
      if (table === "broadcast_poll_votes") {
        const mockEqVotes = vi.fn().mockResolvedValue(votesResult);
        const mockSelectVotes = vi.fn().mockReturnValue({ eq: mockEqVotes });
        return { select: mockSelectVotes };
      }
      return {};
    });
  }

  it("returns null when no active poll exists for the community", async () => {
    setupActivePoll({ data: [], error: null });

    const result = await getActivePoll("comm-1");

    expect(result).toBeNull();
  });

  it("returns null when broadcastRows is null", async () => {
    setupActivePoll({ data: null, error: null });

    const result = await getActivePoll("comm-1");

    expect(result).toBeNull();
  });

  it("returns the active poll with options, vote counts and totalVotes", async () => {
    setupActivePoll({ data: [broadcastRow], error: null });

    const result = await getActivePoll("comm-1");

    expect(result).not.toBeNull();
    expect(result!.broadcastId).toBe("poll-active");
    expect(result!.title).toBe("Best night?");
    expect(result!.options).toHaveLength(2);
    expect(result!.totalVotes).toBe(2);
  });

  it("marks myVotedOptionId correctly for the current user", async () => {
    setupActivePoll({ data: [broadcastRow], error: null });

    const result = await getActivePoll("comm-1");

    // user-1 voted for opt-2
    expect(result!.myVotedOptionId).toBe("opt-2");
    const sabado = result!.options.find((o) => o.optionId === "opt-2");
    expect(sabado!.myVote).toBe(true);
  });

  it("sets myVotedOptionId to null when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    setupActivePoll({ data: [broadcastRow], error: null });

    const result = await getActivePoll("comm-1");

    expect(result!.myVotedOptionId).toBeNull();
  });

  it("exposes expiresAt from the broadcast row", async () => {
    const withDeadline = { ...broadcastRow, expires_at: "2026-06-15T00:00:00Z" };
    setupActivePoll({ data: [withDeadline], error: null });

    const result = await getActivePoll("comm-1");

    expect(result!.expiresAt).toBe("2026-06-15T00:00:00Z");
  });

  it("throws on broadcasts query error", async () => {
    setupActivePoll({ data: null, error: { message: "timeout" } });

    await expect(getActivePoll("comm-1")).rejects.toThrow(
      "Failed to get active poll: timeout"
    );
  });

  it("throws on poll options query error", async () => {
    setupActivePoll(
      { data: [broadcastRow], error: null },
      { data: null, error: { message: "options error" } }
    );

    await expect(getActivePoll("comm-1")).rejects.toThrow(
      "Failed to get poll options: options error"
    );
  });

  it("throws on votes query error", async () => {
    setupActivePoll(
      { data: [broadcastRow], error: null },
      { data: optionRows, error: null },
      { data: null, error: { message: "votes error" } }
    );

    await expect(getActivePoll("comm-1")).rejects.toThrow(
      "Failed to get poll votes: votes error"
    );
  });
});
