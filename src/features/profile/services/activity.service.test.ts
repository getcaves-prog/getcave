import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMyCommunities,
  getMyEvents,
  getMyConversations,
  getRecentActivity,
} from "./activity.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Build a table-specific from() mock with select().eq().order().limit() chain. */
function makeSimpleChain(result: { data: unknown; error: unknown }) {
  const mockLimitLocal = vi.fn().mockResolvedValue(result);
  const mockOrderLocal = vi.fn().mockReturnValue({ limit: mockLimitLocal });
  const mockEqLocal = vi.fn().mockReturnValue({ order: mockOrderLocal });
  const mockSelectLocal = vi.fn().mockReturnValue({ eq: mockEqLocal });
  return {
    select: mockSelectLocal,
    _limit: mockLimitLocal,
    _order: mockOrderLocal,
    _eq: mockEqLocal,
  };
}

// ─── getMyCommunities ─────────────────────────────────────────────────────
describe("getMyCommunities", () => {
  const memberRows = [
    {
      id: "cm-1",
      community_id: "comm-1",
      user_id: "user-1",
      role: "owner",
      joined_at: "2026-06-01T00:00:00Z",
    },
    {
      id: "cm-2",
      community_id: "comm-2",
      user_id: "user-1",
      role: "member",
      joined_at: "2026-05-01T00:00:00Z",
    },
  ];

  const communityRows = [
    {
      id: "comm-1",
      slug: "techno-cave",
      name: "Techno Cave",
      description: "Dark music",
      avatar_url: null,
      cover_url: null,
      city: "Buenos Aires",
      member_count: 42,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      created_by: "user-1",
      zone_id: null,
    },
    {
      id: "comm-2",
      slug: "techno-two",
      name: "Techno Two",
      description: null,
      avatar_url: null,
      cover_url: null,
      city: null,
      member_count: 10,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      created_by: "user-2",
      zone_id: null,
    },
  ];

  function setupMyCommunities(
    membersResult: { data: unknown; error: unknown },
    communitiesResult: { data: unknown; error: unknown } = {
      data: communityRows,
      error: null,
    }
  ) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "community_members") {
        const chain = makeSimpleChain(membersResult);
        return { select: chain.select };
      }
      if (table === "communities") {
        const mockInLocal = vi.fn().mockResolvedValue(communitiesResult);
        const mockSelectLocal = vi.fn().mockReturnValue({ in: mockInLocal });
        return { select: mockSelectLocal };
      }
      return { select: mockSelect };
    });
  }

  it("queries community_members for the userId then batch-fetches communities", async () => {
    setupMyCommunities({ data: memberRows, error: null });

    await getMyCommunities("user-1");

    expect(mockFrom.mock.calls[0][0]).toBe("community_members");
    expect(mockFrom.mock.calls[1][0]).toBe("communities");
  });

  it("maps member rows + communities to MyCommunity shape with role and joined_at", async () => {
    setupMyCommunities({ data: memberRows, error: null });

    const result = await getMyCommunities("user-1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("comm-1");
    expect(result[0].name).toBe("Techno Cave");
    expect(result[0].role).toBe("owner");
    expect(result[0].joined_at).toBe("2026-06-01T00:00:00Z");
    expect(result[0].member_count).toBe(42);
    expect(result[1].role).toBe("member");
    expect(result[1].joined_at).toBe("2026-05-01T00:00:00Z");
  });

  it("orders results by joined_at desc (most recent first)", async () => {
    setupMyCommunities({ data: memberRows, error: null });

    const result = await getMyCommunities("user-1");

    // comm-1 joined at June (newer) should come before comm-2 joined at May
    expect(result[0].joined_at > result[1].joined_at).toBe(true);
  });

  it("returns empty array when user is not a member of any community", async () => {
    setupMyCommunities({ data: [], error: null });

    const result = await getMyCommunities("user-1");

    expect(result).toEqual([]);
  });

  it("returns empty array when data is null without error", async () => {
    setupMyCommunities({ data: null, error: null });

    const result = await getMyCommunities("user-1");

    expect(result).toEqual([]);
  });

  it("throws descriptive error on members query failure", async () => {
    setupMyCommunities({ data: null, error: { message: "DB error" } });

    await expect(getMyCommunities("user-1")).rejects.toThrow(
      "Failed to get my communities: DB error"
    );
  });
});

// ─── getMyEvents ──────────────────────────────────────────────────────────
describe("getMyEvents", () => {
  const futureDate = "2099-01-01";
  const pastDate = "2000-01-01";

  const attendanceRows = [
    {
      id: "att-1",
      flyer_id: "flyer-1",
      user_id: "user-1",
      going_solo: false,
      created_at: "2026-06-01T10:00:00Z",
      updated_at: "2026-06-01T10:00:00Z",
    },
    {
      id: "att-2",
      flyer_id: "flyer-2",
      user_id: "user-1",
      going_solo: true,
      created_at: "2026-05-01T10:00:00Z",
      updated_at: "2026-05-01T10:00:00Z",
    },
  ];

  const flyerRows = [
    {
      id: "flyer-1",
      title: "Future Rave",
      image_url: "https://cdn.example.com/1.jpg",
      event_date: futureDate,
      event_time: "22:00",
      address: "Av. Corrientes 123",
      community_id: "comm-1",
    },
    {
      id: "flyer-2",
      title: "Past Party",
      image_url: "https://cdn.example.com/2.jpg",
      event_date: pastDate,
      event_time: null,
      address: null,
      community_id: null,
    },
  ];

  const communityRows = [
    { id: "comm-1", name: "Techno Cave", slug: "techno-cave" },
  ];

  function setupMyEvents(
    attendanceResult: { data: unknown; error: unknown },
    flyersResult: { data: unknown; error: unknown } = {
      data: flyerRows,
      error: null,
    },
    communitiesResult: { data: unknown; error: unknown } = {
      data: communityRows,
      error: null,
    }
  ) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "event_attendance") {
        const chain = makeSimpleChain(attendanceResult);
        return { select: chain.select };
      }
      if (table === "flyers") {
        const mockInLocal = vi.fn().mockResolvedValue(flyersResult);
        const mockSelectLocal = vi.fn().mockReturnValue({ in: mockInLocal });
        return { select: mockSelectLocal };
      }
      if (table === "communities") {
        const mockInLocal = vi.fn().mockResolvedValue(communitiesResult);
        const mockSelectLocal = vi.fn().mockReturnValue({ in: mockInLocal });
        return { select: mockSelectLocal };
      }
      return { select: mockSelect };
    });
  }

  it("queries event_attendance then batch-fetches flyers and communities", async () => {
    setupMyEvents({ data: attendanceRows, error: null });

    await getMyEvents("user-1");

    const tablesCalled = mockFrom.mock.calls.map((c) => c[0]);
    expect(tablesCalled[0]).toBe("event_attendance");
    expect(tablesCalled[1]).toBe("flyers");
    expect(tablesCalled).toContain("communities");
  });

  it("splits events into upcoming and past by event_date vs today", async () => {
    setupMyEvents({ data: attendanceRows, error: null });

    const result = await getMyEvents("user-1");

    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0].id).toBe("flyer-1");
    expect(result.upcoming[0].event_date).toBe(futureDate);

    expect(result.past).toHaveLength(1);
    expect(result.past[0].id).toBe("flyer-2");
    expect(result.past[0].event_date).toBe(pastDate);
  });

  it("maps going_solo from the attendance row to each MyEvent", async () => {
    setupMyEvents({ data: attendanceRows, error: null });

    const result = await getMyEvents("user-1");

    expect(result.upcoming[0].going_solo).toBe(false);
    expect(result.past[0].going_solo).toBe(true);
  });

  it("maps rsvp_at from event_attendance.created_at", async () => {
    setupMyEvents({ data: attendanceRows, error: null });

    const result = await getMyEvents("user-1");

    expect(result.upcoming[0].rsvp_at).toBe("2026-06-01T10:00:00Z");
    expect(result.past[0].rsvp_at).toBe("2026-05-01T10:00:00Z");
  });

  it("returns empty upcoming and past when user has no RSVPs", async () => {
    setupMyEvents({ data: [], error: null });

    const result = await getMyEvents("user-1");

    expect(result.upcoming).toEqual([]);
    expect(result.past).toEqual([]);
  });

  it("places null event_date events in past (no date = not upcoming)", async () => {
    const nullDateAttendance = [
      {
        id: "att-3",
        flyer_id: "flyer-null",
        user_id: "user-1",
        going_solo: false,
        created_at: "2026-06-01T10:00:00Z",
        updated_at: "2026-06-01T10:00:00Z",
      },
    ];
    const nullDateFlyer = [
      {
        id: "flyer-null",
        title: "No Date",
        image_url: "https://cdn.example.com/x.jpg",
        event_date: null,
        event_time: null,
        address: null,
        community_id: null,
      },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === "event_attendance") {
        const chain = makeSimpleChain({ data: nullDateAttendance, error: null });
        return { select: chain.select };
      }
      if (table === "flyers") {
        const mockInLocal = vi
          .fn()
          .mockResolvedValue({ data: nullDateFlyer, error: null });
        const mockSelectLocal = vi.fn().mockReturnValue({ in: mockInLocal });
        return { select: mockSelectLocal };
      }
      return { select: mockSelect };
    });

    const result = await getMyEvents("user-1");

    expect(result.upcoming).toHaveLength(0);
    expect(result.past).toHaveLength(1);
  });

  it("maps community_name and community_slug onto each MyEvent", async () => {
    setupMyEvents({ data: attendanceRows, error: null });

    const result = await getMyEvents("user-1");

    // flyer-1 belongs to comm-1 → should have community info
    expect(result.upcoming[0].community_name).toBe("Techno Cave");
    expect(result.upcoming[0].community_slug).toBe("techno-cave");

    // flyer-2 has null community_id → community fields should be null
    expect(result.past[0].community_name).toBeNull();
    expect(result.past[0].community_slug).toBeNull();
  });

  it("sets community_name and community_slug to null when community cannot be resolved", async () => {
    setupMyEvents(
      { data: attendanceRows, error: null },
      { data: flyerRows, error: null },
      { data: [], error: null } // community fetch returns empty
    );

    const result = await getMyEvents("user-1");

    expect(result.upcoming[0].community_name).toBeNull();
    expect(result.upcoming[0].community_slug).toBeNull();
  });

  it("skips communities query when all flyers have null community_id", async () => {
    const noCommunityFlyers = flyerRows.map((f) => ({ ...f, community_id: null }));
    setupMyEvents(
      { data: attendanceRows, error: null },
      { data: noCommunityFlyers, error: null }
    );

    await getMyEvents("user-1");

    const tablesCalled = mockFrom.mock.calls.map((c) => c[0]);
    // communities should NOT be called when there are no community_ids
    expect(tablesCalled).not.toContain("communities");
  });

  it("throws descriptive error on attendance query failure", async () => {
    setupMyEvents({ data: null, error: { message: "RLS denied" } });

    await expect(getMyEvents("user-1")).rejects.toThrow(
      "Failed to get my events: RLS denied"
    );
  });
});

// ─── getMyConversations ───────────────────────────────────────────────────
describe("getMyConversations", () => {
  const messageRows = [
    {
      id: "msg-1",
      conversation_id: "conv-1",
      author_id: "user-1",
      body: "Hola!",
      created_at: "2026-06-01T10:00:00Z",
      is_deleted: false,
    },
    {
      id: "msg-2",
      conversation_id: "conv-2",
      author_id: "user-1",
      body: "Buenas",
      created_at: "2026-06-02T09:00:00Z",
      is_deleted: false,
    },
    // duplicate conv-1 — should be de-duped
    {
      id: "msg-3",
      conversation_id: "conv-1",
      author_id: "user-1",
      body: "Algo más",
      created_at: "2026-06-01T11:00:00Z",
      is_deleted: false,
    },
  ];

  const convRows = [
    { id: "conv-1", subject_type: "flyer", subject_id: "flyer-1", created_at: "2026-06-01T00:00:00Z" },
    { id: "conv-2", subject_type: "community", subject_id: "comm-1", created_at: "2026-06-01T00:00:00Z" },
  ];

  const flyerRows = [
    { id: "flyer-1", title: "Techno Night" },
  ];

  const communityRows = [
    { id: "comm-1", name: "Cave Collective", slug: "cave-collective" },
  ];

  function setupMyConversations(
    messagesResult: { data: unknown; error: unknown },
    conversationsResult: { data: unknown; error: unknown } = { data: convRows, error: null },
    flyersResult: { data: unknown; error: unknown } = { data: flyerRows, error: null },
    communitiesResult: { data: unknown; error: unknown } = { data: communityRows, error: null }
  ) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "messages") {
        const chain = makeSimpleChain(messagesResult);
        return { select: chain.select };
      }
      if (table === "conversations") {
        const mockInConvs = vi.fn().mockResolvedValue(conversationsResult);
        const mockSelectConvs = vi.fn().mockReturnValue({ in: mockInConvs });
        return { select: mockSelectConvs };
      }
      if (table === "flyers") {
        const mockInFlyers = vi.fn().mockResolvedValue(flyersResult);
        const mockSelectFlyers = vi.fn().mockReturnValue({ in: mockInFlyers });
        return { select: mockSelectFlyers };
      }
      if (table === "communities") {
        const mockInComms = vi.fn().mockResolvedValue(communitiesResult);
        const mockSelectComms = vi.fn().mockReturnValue({ in: mockInComms });
        return { select: mockSelectComms };
      }
      return { select: mockSelect };
    });
  }

  it("queries messages by author_id then resolves conversations and subjects", async () => {
    setupMyConversations({ data: messageRows, error: null });

    await getMyConversations("user-1");

    const tablesCalled = mockFrom.mock.calls.map((c) => c[0]);
    expect(tablesCalled).toContain("messages");
    expect(tablesCalled).toContain("conversations");
    expect(tablesCalled).toContain("flyers");
    expect(tablesCalled).toContain("communities");
  });

  it("de-dupes conversations — returns one entry per conversation_id", async () => {
    setupMyConversations({ data: messageRows, error: null });

    const result = await getMyConversations("user-1");

    // conv-1 appears twice in messages but should appear once in result
    const convIds = result.map((c) => c.conversation_id);
    expect(new Set(convIds).size).toBe(convIds.length);
    expect(result).toHaveLength(2);
  });

  it("resolves flyer subject label from flyers.title", async () => {
    setupMyConversations({ data: messageRows, error: null });

    const result = await getMyConversations("user-1");

    const flyerConv = result.find((c) => c.subject_type === "flyer");
    expect(flyerConv).toBeDefined();
    expect(flyerConv!.subject_label).toBe("Techno Night");
  });

  it("resolves community subject label from communities.name", async () => {
    setupMyConversations({ data: messageRows, error: null });

    const result = await getMyConversations("user-1");

    const commConv = result.find((c) => c.subject_type === "community");
    expect(commConv).toBeDefined();
    expect(commConv!.subject_label).toBe("Cave Collective");
  });

  it("resolves community_slug for community subjects (used for /communities/[slug] routing)", async () => {
    setupMyConversations({ data: messageRows, error: null });

    const result = await getMyConversations("user-1");

    const commConv = result.find((c) => c.subject_type === "community");
    expect(commConv).toBeDefined();
    expect(commConv!.community_slug).toBe("cave-collective");
  });

  it("sets community_slug to null for flyer subjects", async () => {
    setupMyConversations({ data: messageRows, error: null });

    const result = await getMyConversations("user-1");

    const flyerConv = result.find((c) => c.subject_type === "flyer");
    expect(flyerConv).toBeDefined();
    expect(flyerConv!.community_slug).toBeNull();
  });

  it("sets community_slug to null when community cannot be resolved", async () => {
    setupMyConversations(
      { data: messageRows, error: null },
      { data: convRows, error: null },
      { data: flyerRows, error: null },
      { data: [], error: null } // community not found
    );

    const result = await getMyConversations("user-1");

    const commConv = result.find((c) => c.subject_type === "community");
    expect(commConv).toBeDefined();
    expect(commConv!.community_slug).toBeNull();
  });

  it("sets subject_label to null when subject cannot be resolved", async () => {
    setupMyConversations(
      { data: messageRows, error: null },
      { data: convRows, error: null },
      { data: [], error: null }, // no flyers found
      { data: [], error: null } // no communities found
    );

    const result = await getMyConversations("user-1");

    expect(result.every((c) => c.subject_label === null)).toBe(true);
  });

  it("sets last_activity_at to the most recent message timestamp for each conversation", async () => {
    setupMyConversations({ data: messageRows, error: null });

    const result = await getMyConversations("user-1");

    const flyerConv = result.find((c) => c.conversation_id === "conv-1");
    // msg-3 at 11:00 is more recent than msg-1 at 10:00
    expect(flyerConv!.last_activity_at).toBe("2026-06-01T11:00:00Z");
  });

  it("returns empty array when user has posted no messages", async () => {
    setupMyConversations({ data: [], error: null });

    const result = await getMyConversations("user-1");

    expect(result).toEqual([]);
  });

  it("respects opts.limit", async () => {
    // Build enough message rows
    const manyMessages = Array.from({ length: 5 }, (_, i) => ({
      id: `msg-${i}`,
      conversation_id: `conv-${i}`,
      author_id: "user-1",
      body: `msg ${i}`,
      created_at: `2026-06-0${i + 1}T00:00:00Z`,
      is_deleted: false,
    }));
    const manyConvs = manyMessages.map((m) => ({
      id: m.conversation_id,
      subject_type: "flyer",
      subject_id: `flyer-${m.id}`,
      created_at: "2026-06-01T00:00:00Z",
    }));
    setupMyConversations(
      { data: manyMessages, error: null },
      { data: manyConvs, error: null },
      { data: [], error: null },
      { data: [], error: null }
    );

    const result = await getMyConversations("user-1", { limit: 3 });

    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("throws descriptive error on messages query failure", async () => {
    setupMyConversations({ data: null, error: { message: "RLS denied" } });

    await expect(getMyConversations("user-1")).rejects.toThrow(
      "Failed to get my conversations: RLS denied"
    );
  });
});

// ─── getRecentActivity ────────────────────────────────────────────────────
describe("getRecentActivity", () => {
  const memberRows = [
    {
      id: "cm-1",
      community_id: "comm-1",
      user_id: "user-1",
      role: "member",
      joined_at: "2026-06-03T08:00:00Z",
    },
  ];
  const communityRows = [
    { id: "comm-1", name: "Techno Cave", slug: "techno-cave" },
  ];
  const attendanceRows = [
    {
      id: "att-1",
      flyer_id: "flyer-1",
      user_id: "user-1",
      going_solo: false,
      created_at: "2026-06-02T10:00:00Z",
      updated_at: "2026-06-02T10:00:00Z",
    },
  ];
  const flyerRows = [
    { id: "flyer-1", title: "Rave 2026", event_date: "2099-01-01" },
  ];
  const messageRows = [
    {
      id: "msg-1",
      conversation_id: "conv-1",
      author_id: "user-1",
      body: "Hola cueva!",
      created_at: "2026-06-01T12:00:00Z",
      is_deleted: false,
    },
  ];

  function setupRecentActivity(opts?: {
    members?: { data: unknown; error: unknown };
    communities?: { data: unknown; error: unknown };
    attendance?: { data: unknown; error: unknown };
    flyers?: { data: unknown; error: unknown };
    messages?: { data: unknown; error: unknown };
  }) {
    const m = { ...{ members: { data: memberRows, error: null }, communities: { data: communityRows, error: null }, attendance: { data: attendanceRows, error: null }, flyers: { data: flyerRows, error: null }, messages: { data: messageRows, error: null } }, ...opts };

    // Track per-table call counts for tables that appear multiple times (flyers, communities)
    const callCounters: Record<string, number> = {};

    mockFrom.mockImplementation((table: string) => {
      callCounters[table] = (callCounters[table] ?? 0) + 1;

      if (table === "community_members") {
        const chain = makeSimpleChain(m.members!);
        return { select: chain.select };
      }
      if (table === "communities") {
        // First call is for community_members join, second is for messages subject resolution
        const inResult = m.communities!;
        const mockInLocal = vi.fn().mockResolvedValue(inResult);
        const mockSelectLocal = vi.fn().mockReturnValue({ in: mockInLocal });
        return { select: mockSelectLocal };
      }
      if (table === "event_attendance") {
        const chain = makeSimpleChain(m.attendance!);
        return { select: chain.select };
      }
      if (table === "flyers") {
        const mockInLocal = vi.fn().mockResolvedValue(m.flyers!);
        const mockSelectLocal = vi.fn().mockReturnValue({ in: mockInLocal });
        return { select: mockSelectLocal };
      }
      if (table === "messages") {
        const chain = makeSimpleChain(m.messages!);
        return { select: chain.select };
      }
      return { select: mockSelect };
    });
  }

  it("merges community joins, event RSVPs, and messages into a single sorted list", async () => {
    setupRecentActivity();

    const result = await getRecentActivity("user-1");

    const types = result.map((a) => a.type);
    expect(types).toContain("joined_community");
    expect(types).toContain("rsvp_event");
    expect(types).toContain("posted_message");
  });

  it("sorts the merged list by timestamp descending (most recent first)", async () => {
    setupRecentActivity();

    const result = await getRecentActivity("user-1");

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].timestamp >= result[i + 1].timestamp).toBe(true);
    }
  });

  it("includes discriminated type fields for each activity kind", async () => {
    setupRecentActivity();

    const result = await getRecentActivity("user-1");

    const joined = result.find((a) => a.type === "joined_community");
    expect(joined).toBeDefined();
    expect((joined as { community_name: string }).community_name).toBe("Techno Cave");

    const rsvp = result.find((a) => a.type === "rsvp_event");
    expect(rsvp).toBeDefined();
    expect((rsvp as { flyer_title: string | null }).flyer_title).toBe("Rave 2026");
    expect((rsvp as { going_solo: boolean }).going_solo).toBe(false);

    const posted = result.find((a) => a.type === "posted_message");
    expect(posted).toBeDefined();
    expect((posted as { conversation_id: string }).conversation_id).toBe("conv-1");
  });

  it("respects limit (default 20) by slicing the merged result", async () => {
    // Generate 30 message rows with distinct conversation ids
    const manyMessages = Array.from({ length: 30 }, (_, i) => ({
      id: `msg-${i}`,
      conversation_id: `conv-${i}`,
      author_id: "user-1",
      body: `msg ${i}`,
      created_at: `2026-06-01T${String(i).padStart(2, "0")}:00:00Z`,
      is_deleted: false,
    }));
    setupRecentActivity({
      members: { data: [], error: null },
      communities: { data: [], error: null },
      attendance: { data: [], error: null },
      flyers: { data: [], error: null },
      messages: { data: manyMessages, error: null },
    });

    const result = await getRecentActivity("user-1");

    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("respects custom limit", async () => {
    setupRecentActivity();

    const result = await getRecentActivity("user-1", { limit: 2 });

    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("returns empty array when user has no activity", async () => {
    setupRecentActivity({
      members: { data: [], error: null },
      communities: { data: [], error: null },
      attendance: { data: [], error: null },
      flyers: { data: [], error: null },
      messages: { data: [], error: null },
    });

    const result = await getRecentActivity("user-1");

    expect(result).toEqual([]);
  });

  it("body_preview on posted_message is truncated or null for deleted messages", async () => {
    const deletedMsg = [
      {
        id: "msg-del",
        conversation_id: "conv-del",
        author_id: "user-1",
        body: "contenido eliminado",
        created_at: "2026-06-01T00:00:00Z",
        is_deleted: true,
      },
    ];
    setupRecentActivity({
      members: { data: [], error: null },
      communities: { data: [], error: null },
      attendance: { data: [], error: null },
      flyers: { data: [], error: null },
      messages: { data: deletedMsg, error: null },
    });

    const result = await getRecentActivity("user-1");

    const posted = result.find((a) => a.type === "posted_message");
    expect(posted).toBeDefined();
    expect((posted as { body_preview: string | null }).body_preview).toBeNull();
  });
});
