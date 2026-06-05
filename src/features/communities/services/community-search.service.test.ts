import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchCommunities,
  getRecommendedCommunities,
} from "./community-search.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockIn = vi.fn();
const mockNotIsNull = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

// ─── Mock interests service ────────────────────────────────────────────────
vi.mock("@/features/onboarding/services/interests.service", () => ({
  getMyInterests: vi.fn(),
}));

import { getMyInterests } from "@/features/onboarding/services/interests.service";
const mockGetMyInterests = vi.mocked(getMyInterests);

// ─── Mock community service ────────────────────────────────────────────────
vi.mock("./community.service", () => ({
  listCommunities: vi.fn(),
}));

import { listCommunities } from "./community.service";
const mockListCommunities = vi.mocked(listCommunities);

// ─── Fixture communities ───────────────────────────────────────────────────
const commBsAs50 = {
  id: "c1", slug: "cave-bsas", name: "Cave Buenos Aires", description: "Underground cave",
  avatar_url: null, city: "Buenos Aires", member_count: 50, is_seeded: false,
  cover_url: null, zone_id: null, created_by: "u1", created_at: "", updated_at: "",
  source_platform: null, source_url: null, claimed_at: null, claimed_by: null,
};
const commMdq20 = {
  id: "c2", slug: "tribu-mdq", name: "Tribu Mar del Plata", description: "Mar y música",
  avatar_url: null, city: "Mar del Plata", member_count: 20, is_seeded: false,
  cover_url: null, zone_id: null, created_by: "u2", created_at: "", updated_at: "",
  source_platform: null, source_url: null, claimed_at: null, claimed_by: null,
};
const commBsAs100 = {
  id: "c3", slug: "techno-bsas", name: "Techno Buenos Aires", description: "Techno underground",
  avatar_url: null, city: "Buenos Aires", member_count: 100, is_seeded: true,
  cover_url: null, zone_id: null, created_by: "u3", created_at: "", updated_at: "",
  source_platform: null, source_url: null, claimed_at: null, claimed_by: null,
};
const commNullCity5 = {
  id: "c4", slug: "sin-ciudad", name: "Sin Ciudad", description: "Nómade",
  avatar_url: null, city: null, member_count: 5, is_seeded: false,
  cover_url: null, zone_id: null, created_by: "u4", created_at: "", updated_at: "",
  source_platform: null, source_url: null, claimed_at: null, claimed_by: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── searchCommunities ─────────────────────────────────────────────────────
describe("searchCommunities", () => {
  function setupSearchChain(result: { data: unknown; error: unknown }) {
    mockLimit.mockResolvedValue(result);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockOr.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ or: mockOr });
    mockFrom.mockReturnValue({ select: mockSelect });
  }

  it("queries communities with name OR description ilike filter", async () => {
    setupSearchChain({ data: [commBsAs50], error: null });

    const result = await searchCommunities("cave");

    expect(mockFrom).toHaveBeenCalledWith("communities");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockOr).toHaveBeenCalledWith("name.ilike.%cave%,description.ilike.%cave%");
    expect(mockOrder).toHaveBeenCalledWith("member_count", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(30);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("cave-bsas");
  });

  it("returns empty array for empty string WITHOUT network call", async () => {
    const result = await searchCommunities("");

    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns empty array for whitespace-only string WITHOUT network call", async () => {
    const result = await searchCommunities("   ");

    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("strips PostgREST reserved chars (, ( )) from the query", async () => {
    setupSearchChain({ data: [], error: null });

    await searchCommunities("cave(bsas,2026)");

    expect(mockOr).toHaveBeenCalledWith("name.ilike.%cavebsas2026%,description.ilike.%cavebsas2026%");
  });

  it("trims whitespace from query before sending to network", async () => {
    setupSearchChain({ data: [], error: null });

    await searchCommunities("  techno  ");

    expect(mockOr).toHaveBeenCalledWith("name.ilike.%techno%,description.ilike.%techno%");
  });

  it("respects custom limit option", async () => {
    setupSearchChain({ data: [], error: null });

    await searchCommunities("techno", { limit: 10 });

    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("returns empty array when Supabase data is null without error", async () => {
    setupSearchChain({ data: null, error: null });

    const result = await searchCommunities("techno");

    expect(result).toEqual([]);
  });

  it("throws descriptive error on Supabase failure", async () => {
    setupSearchChain({ data: null, error: { message: "DB error" } });

    await expect(searchCommunities("techno")).rejects.toThrow(
      "Failed to search communities: DB error"
    );
  });
});

// ─── getRecommendedCommunities ─────────────────────────────────────────────
describe("getRecommendedCommunities", () => {
  function setupFlierAffinityChain(communityIds: string[]) {
    // Chain: from("flyers").select("community_id").in("community_id", [...])
    // Actually: from("flyer_categories").select(...)...
    // The service queries flyer_categories joined with flyers
    // mock: from("flyers").select("community_id").not("community_id","is",null).in(...)
    const rows = communityIds.map((id) => ({ community_id: id }));
    mockIn.mockResolvedValue({ data: rows, error: null });
    mockNotIsNull.mockReturnValue({ in: mockIn });
    mockSelect.mockReturnValue({ not: mockNotIsNull });
    // Differentiate from() calls by table name
    mockFrom.mockImplementation((table: string) => {
      if (table === "flyers") {
        return { select: mockSelect };
      }
      return { select: mockSelect };
    });
  }

  it("puts communities with matching city first, then by member_count", async () => {
    mockListCommunities.mockResolvedValue([commBsAs100, commBsAs50, commMdq20, commNullCity5]);
    mockGetMyInterests.mockResolvedValue([]);
    // No affinity query needed when interests are empty
    setupFlierAffinityChain([]);

    const result = await getRecommendedCommunities({ userId: "u1", city: "Buenos Aires" });

    // c3 (BsAs, 100) and c1 (BsAs, 50) before c2 (MdP, 20) and c4 (null city, 5)
    expect(result[0].id).toBe("c3");
    expect(result[1].id).toBe("c1");
    expect(result[2].id).toBe("c2");
    expect(result[3].id).toBe("c4");
  });

  it("boosts communities with interest affinity — city match wins first", async () => {
    mockListCommunities.mockResolvedValue([commBsAs100, commMdq20, commNullCity5]);
    mockGetMyInterests.mockResolvedValue(["cat-techno"]);

    // flyer_categories query returns flyers for c2 (affinity match)
    mockFrom.mockImplementation((table: string) => {
      if (table === "flyer_categories") {
        const mockInAffinity = vi.fn().mockResolvedValue({
          data: [{ flyer_id: "f1" }],
          error: null,
        });
        const mockSelectAffinity = vi.fn().mockReturnValue({ in: mockInAffinity });
        return { select: mockSelectAffinity };
      }
      if (table === "flyers") {
        const mockInFlyers = vi.fn().mockResolvedValue({
          data: [{ community_id: "c2" }],
          error: null,
        });
        const mockNotFlyers = vi.fn().mockReturnValue({ in: mockInFlyers });
        const mockSelectFlyers = vi.fn().mockReturnValue({ not: mockNotFlyers });
        return { select: mockSelectFlyers };
      }
      return { select: mockSelect };
    });

    const result = await getRecommendedCommunities({
      userId: "u1",
      city: "Buenos Aires",
    });

    // c1 (BsAs) first (city match), then c2 (affinity), then c4 (neither)
    expect(result[0].id).toBe("c3"); // city match + highest member_count
    expect(result.some((c) => c.id === "c2")).toBe(true); // affinity community present
  });

  it("falls back gracefully when interests are empty — uses city + member_count", async () => {
    mockListCommunities.mockResolvedValue([commBsAs50, commMdq20]);
    mockGetMyInterests.mockResolvedValue([]);

    const result = await getRecommendedCommunities({ userId: "u1", city: "Buenos Aires" });

    expect(result[0].id).toBe("c1"); // city match
    expect(result[1].id).toBe("c2"); // no city match
  });

  it("falls back gracefully when getMyInterests throws", async () => {
    mockListCommunities.mockResolvedValue([commBsAs50, commMdq20]);
    mockGetMyInterests.mockRejectedValue(new Error("Not authenticated"));

    // Should not throw, just use city + member_count
    const result = await getRecommendedCommunities({ city: "Buenos Aires" });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("c1");
  });

  it("works without city — orders by member_count only", async () => {
    mockListCommunities.mockResolvedValue([commMdq20, commBsAs100]);
    mockGetMyInterests.mockResolvedValue([]);

    const result = await getRecommendedCommunities({});

    // listCommunities already returns ordered, ranking preserves that
    expect(result[0].id).toBe("c3");
    expect(result[1].id).toBe("c2");
  });

  it("works with no options at all", async () => {
    mockListCommunities.mockResolvedValue([commBsAs50]);
    mockGetMyInterests.mockRejectedValue(new Error("No user"));

    const result = await getRecommendedCommunities();

    expect(result).toHaveLength(1);
  });

  it("passes custom limit to listCommunities", async () => {
    mockListCommunities.mockResolvedValue([commBsAs100, commBsAs50]);
    mockGetMyInterests.mockResolvedValue([]);

    await getRecommendedCommunities({ limit: 10 });

    expect(mockListCommunities).toHaveBeenCalledWith({ limit: 10 });
  });
});
