import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCommunity,
  getCommunityBySlug,
  listCommunities,
  joinCommunity,
  leaveCommunity,
  getMembership,
  listMembers,
  listCommunityEvents,
  promoteMember,
} from "./community.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockMaybeSingle = vi.fn();
const mockLte = vi.fn();
const mockGte = vi.fn();
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

// ─── createCommunity ───────────────────────────────────────────────────────
describe("createCommunity", () => {
  const mockCommunity = {
    id: "comm-1",
    slug: "tulum-party",
    name: "Tulum Party Collective",
    description: null,
    avatar_url: null,
    cover_url: null,
    city: null,
    zone_id: null,
    created_by: "user-1",
    member_count: 1,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  };

  beforeEach(() => {
    mockRpc.mockResolvedValue({ data: mockCommunity, error: null });
  });

  it("calls create_community RPC with correct params", async () => {
    const result = await createCommunity({
      slug: "tulum-party",
      name: "Tulum Party Collective",
    });

    expect(mockRpc).toHaveBeenCalledWith("create_community", {
      p_slug: "tulum-party",
      p_name: "Tulum Party Collective",
      p_description: undefined,
      p_avatar_url: undefined,
      p_cover_url: undefined,
      p_city: undefined,
      p_zone_id: undefined,
    });
    expect(result.slug).toBe("tulum-party");
    expect(result.member_count).toBe(1);
  });

  it("maps optional fields to RPC params correctly", async () => {
    await createCommunity({
      slug: "cueva-techno",
      name: "Cueva Techno",
      description: "Dark music",
      avatarUrl: "https://cdn.example.com/av.jpg",
      coverUrl: "https://cdn.example.com/cover.jpg",
      city: "Buenos Aires",
      zoneId: "zone-1",
    });

    expect(mockRpc).toHaveBeenCalledWith("create_community", {
      p_slug: "cueva-techno",
      p_name: "Cueva Techno",
      p_description: "Dark music",
      p_avatar_url: "https://cdn.example.com/av.jpg",
      p_cover_url: "https://cdn.example.com/cover.jpg",
      p_city: "Buenos Aires",
      p_zone_id: "zone-1",
    });
  });

  it("throws validation error for empty slug WITHOUT hitting the network", async () => {
    await expect(createCommunity({ slug: "", name: "Valid Name" })).rejects.toThrow(
      "slug"
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throws validation error for whitespace-only slug WITHOUT hitting the network", async () => {
    await expect(createCommunity({ slug: "   ", name: "Valid Name" })).rejects.toThrow(
      "slug"
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throws validation error for empty name WITHOUT hitting the network", async () => {
    await expect(createCommunity({ slug: "valid-slug", name: "" })).rejects.toThrow(
      "name"
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throws descriptive error on RPC failure", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Slug already taken" } });

    await expect(
      createCommunity({ slug: "tulum-party", name: "Tulum Party" })
    ).rejects.toThrow("Failed to create community: Slug already taken");
  });
});

// ─── getCommunityBySlug ────────────────────────────────────────────────────
describe("getCommunityBySlug", () => {
  beforeEach(() => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "comm-1",
        slug: "tulum-party",
        name: "Tulum Party Collective",
        description: null,
        avatar_url: null,
        cover_url: null,
        city: null,
        zone_id: null,
        created_by: "user-1",
        member_count: 5,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
      },
      error: null,
    });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("queries communities by slug and returns the row", async () => {
    const result = await getCommunityBySlug("tulum-party");

    expect(mockFrom).toHaveBeenCalledWith("communities");
    expect(mockEq).toHaveBeenCalledWith("slug", "tulum-party");
    expect(result).not.toBeNull();
    expect(result!.slug).toBe("tulum-party");
    expect(result!.member_count).toBe(5);
  });

  it("returns null when community does not exist", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getCommunityBySlug("nonexistent");

    expect(result).toBeNull();
  });

  it("throws on Supabase error", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

    await expect(getCommunityBySlug("tulum-party")).rejects.toThrow(
      "Failed to get community: DB error"
    );
  });
});

// ─── listCommunities ───────────────────────────────────────────────────────
describe("listCommunities", () => {
  const mockCommunities = [
    { id: "c1", slug: "a", name: "A", member_count: 100 },
    { id: "c2", slug: "b", name: "B", member_count: 50 },
  ];

  beforeEach(() => {
    // Chain: from().select().order().limit()
    mockLimit.mockResolvedValue({ data: mockCommunities, error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("orders by member_count descending with default limit 50", async () => {
    const result = await listCommunities();

    expect(mockFrom).toHaveBeenCalledWith("communities");
    expect(mockOrder).toHaveBeenCalledWith("member_count", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(2);
    expect(result[0].member_count).toBe(100);
  });

  it("filters by city when provided", async () => {
    await listCommunities({ city: "Buenos Aires" });

    expect(mockEq).toHaveBeenCalledWith("city", "Buenos Aires");
  });

  it("respects custom limit", async () => {
    await listCommunities({ limit: 10 });

    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("returns empty array when data is null without error", async () => {
    mockLimit.mockResolvedValue({ data: null, error: null });

    const result = await listCommunities();

    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: "DB error" } });

    await expect(listCommunities()).rejects.toThrow("Failed to list communities: DB error");
  });
});

// ─── joinCommunity ─────────────────────────────────────────────────────────
describe("joinCommunity", () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("inserts a community_members row with role='member'", async () => {
    await joinCommunity("comm-1");

    expect(mockFrom).toHaveBeenCalledWith("community_members");
    expect(mockInsert).toHaveBeenCalledWith({
      community_id: "comm-1",
      user_id: "user-1",
      role: "member",
    });
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(joinCommunity("comm-1")).rejects.toThrow("Tenés que iniciar sesión");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    mockInsert.mockResolvedValue({ error: { message: "Already a member" } });

    await expect(joinCommunity("comm-1")).rejects.toThrow(
      "Failed to join community: Already a member"
    );
  });
});

// ─── leaveCommunity ────────────────────────────────────────────────────────
describe("leaveCommunity", () => {
  const mockDeleteEq = vi.fn();
  const mockDeleteNestedEq = vi.fn();

  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    // from().delete().eq("community_id").eq("user_id")
    mockDeleteNestedEq.mockResolvedValue({ error: null });
    mockDeleteEq.mockReturnValue({ eq: mockDeleteNestedEq });
    mockDelete.mockReturnValue({ eq: mockDeleteEq });
    mockFrom.mockReturnValue({ delete: mockDelete });
  });

  it("deletes own community_members row", async () => {
    await leaveCommunity("comm-1");

    expect(mockFrom).toHaveBeenCalledWith("community_members");
    expect(mockDeleteEq).toHaveBeenCalledWith("community_id", "comm-1");
    expect(mockDeleteNestedEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(leaveCommunity("comm-1")).rejects.toThrow("Tenés que iniciar sesión");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    mockDeleteNestedEq.mockResolvedValue({ error: { message: "RLS denied" } });

    await expect(leaveCommunity("comm-1")).rejects.toThrow(
      "Failed to leave community: RLS denied"
    );
  });
});

// ─── getMembership ─────────────────────────────────────────────────────────
describe("getMembership", () => {
  beforeEach(() => {
    mockMaybeSingle.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("queries community_members for the given communityId + userId", async () => {
    const result = await getMembership("comm-1", "user-1");

    expect(mockFrom).toHaveBeenCalledWith("community_members");
    expect(result).toEqual({ role: "admin" });
  });

  it("returns null when not a member", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getMembership("comm-1", "user-99");

    expect(result).toBeNull();
  });

  it("throws on Supabase error", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

    await expect(getMembership("comm-1", "user-1")).rejects.toThrow(
      "Failed to get membership: DB error"
    );
  });
});

// ─── listMembers ───────────────────────────────────────────────────────────
describe("listMembers", () => {
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
      community_id: "comm-1",
      user_id: "user-2",
      role: "member",
      joined_at: "2026-06-02T00:00:00Z",
    },
  ];

  const profilesData = [
    { id: "user-1", username: "dj_tulum", avatar_url: "https://x.com/av1.jpg" },
    { id: "user-2", username: "cave_goer", avatar_url: null },
  ];

  function setupListMembersChain(
    membersResult: { data: unknown; error: unknown },
    profilesResult: { data: unknown; error: unknown } = { data: profilesData, error: null }
  ) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "community_members") {
        const mockLimitMembers = vi.fn().mockResolvedValue(membersResult);
        const mockOrderMembers = vi.fn().mockReturnValue({ limit: mockLimitMembers });
        const mockEqMembers = vi.fn().mockReturnValue({ order: mockOrderMembers });
        const mockSelectMembers = vi.fn().mockReturnValue({ eq: mockEqMembers });
        return { select: mockSelectMembers };
      }
      if (table === "profiles") {
        const mockInProfiles = vi.fn().mockResolvedValue(profilesResult);
        const mockSelectProfiles = vi.fn().mockReturnValue({ in: mockInProfiles });
        return { select: mockSelectProfiles };
      }
      return { select: mockSelect };
    });
  }

  it("queries community_members then batch-fetches profiles", async () => {
    setupListMembersChain({ data: memberRows, error: null });

    await listMembers("comm-1");

    expect(mockFrom.mock.calls[0][0]).toBe("community_members");
    expect(mockFrom.mock.calls[1][0]).toBe("profiles");
  });

  it("maps member rows + profiles to MemberWithProfile shape", async () => {
    setupListMembersChain({ data: memberRows, error: null });

    const result = await listMembers("comm-1");

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("owner");
    expect(result[0].profile).toEqual({
      id: "user-1",
      username: "dj_tulum",
      avatar_url: "https://x.com/av1.jpg",
    });
    expect(result[1].profile).toEqual({
      id: "user-2",
      username: "cave_goer",
      avatar_url: null,
    });
  });

  it("sets profile to null when profile not found for user", async () => {
    setupListMembersChain(
      { data: memberRows, error: null },
      { data: [{ id: "user-1", username: "dj_tulum", avatar_url: null }], error: null }
    );

    const result = await listMembers("comm-1");

    expect(result[1].profile).toBeNull();
  });

  it("throws on Supabase error from members query", async () => {
    setupListMembersChain({ data: null, error: { message: "DB error" } });

    await expect(listMembers("comm-1")).rejects.toThrow(
      "Failed to list members: DB error"
    );
  });

  it("returns empty array when data is null without error", async () => {
    setupListMembersChain({ data: null, error: null }, { data: [], error: null });

    const result = await listMembers("comm-1");

    expect(result).toEqual([]);
  });
});

// ─── listCommunityEvents ───────────────────────────────────────────────────
describe("listCommunityEvents", () => {
  const upcomingFlyers = [
    { id: "f1", community_id: "comm-1", event_date: "2026-07-01", title: "Future" },
    { id: "f2", community_id: "comm-1", event_date: "2026-08-01", title: "Far Future" },
  ];
  const pastFlyers = [
    { id: "f3", community_id: "comm-1", event_date: "2026-05-01", title: "Past" },
  ];

  function setupEventsChain(result: { data: unknown; error: unknown }) {
    mockLimit.mockResolvedValue(result);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockGte.mockReturnValue({ order: mockOrder });
    mockLte.mockReturnValue({ order: mockOrder });
    mockEq.mockReturnValue({ gte: mockGte, lte: mockLte });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  }

  it("queries upcoming flyers with gte today and ascending order", async () => {
    setupEventsChain({ data: upcomingFlyers, error: null });

    const result = await listCommunityEvents("comm-1", "upcoming");

    expect(mockFrom).toHaveBeenCalledWith("flyers");
    expect(mockEq).toHaveBeenCalledWith("community_id", "comm-1");
    expect(mockGte).toHaveBeenCalled();
    expect(mockOrder).toHaveBeenCalledWith("event_date", { ascending: true });
    expect(result).toHaveLength(2);
  });

  it("queries past flyers with lte today and descending order", async () => {
    setupEventsChain({ data: pastFlyers, error: null });

    const result = await listCommunityEvents("comm-1", "past");

    expect(mockLte).toHaveBeenCalled();
    expect(mockOrder).toHaveBeenCalledWith("event_date", { ascending: false });
    expect(result).toHaveLength(1);
  });

  it("returns empty array when data is null without error", async () => {
    setupEventsChain({ data: null, error: null });

    const result = await listCommunityEvents("comm-1", "upcoming");

    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    setupEventsChain({ data: null, error: { message: "DB error" } });

    await expect(listCommunityEvents("comm-1", "upcoming")).rejects.toThrow(
      "Failed to list community events: DB error"
    );
  });
});

// ─── promoteMember ─────────────────────────────────────────────────────────
describe("promoteMember", () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({ data: { id: "cm-1", role: "admin" }, error: null });
  });

  it("calls promote_community_member RPC with correct params", async () => {
    await promoteMember("comm-1", "user-2", "admin");

    expect(mockRpc).toHaveBeenCalledWith("promote_community_member", {
      p_community_id: "comm-1",
      p_user_id: "user-2",
      p_role: "admin",
    });
  });

  it("throws on RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Not authorized" } });

    await expect(promoteMember("comm-1", "user-2", "admin")).rejects.toThrow(
      "Failed to promote member: Not authorized"
    );
  });
});
