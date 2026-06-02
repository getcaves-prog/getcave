import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listCategories,
  getMyInterests,
  setMyInterests,
} from "./interests.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
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

// ─── listCategories ────────────────────────────────────────────────────────
describe("listCategories", () => {
  const mockCategories = [
    { id: "cat-1", name: "Arte", slug: "art", icon: "🎨", color: null, created_at: "2026-01-01" },
    { id: "cat-2", name: "Música", slug: "music", icon: "🎵", color: null, created_at: "2026-01-01" },
    { id: "cat-3", name: "Teatro", slug: "theater", icon: "🎭", color: null, created_at: "2026-01-01" },
  ];

  beforeEach(() => {
    mockOrder.mockResolvedValue({ data: mockCategories, error: null });
    mockSelect.mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("queries the categories table ordered by name ascending", async () => {
    const result = await listCategories();

    expect(mockFrom).toHaveBeenCalledWith("categories");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockOrder).toHaveBeenCalledWith("name");
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Arte");
  });

  it("returns empty array when data is null without error", async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });

    const result = await listCategories();

    expect(result).toEqual([]);
  });

  it("throws a descriptive error on Supabase failure", async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: "DB timeout" } });

    await expect(listCategories()).rejects.toThrow("Failed to fetch categories: DB timeout");
  });
});

// ─── getMyInterests ────────────────────────────────────────────────────────
describe("getMyInterests", () => {
  const mockRows = [
    { category_id: "cat-1", user_id: "user-1", created_at: "2026-01-01" },
    { category_id: "cat-3", user_id: "user-1", created_at: "2026-01-01" },
  ];

  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockEq.mockResolvedValue({ data: mockRows, error: null });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("queries user_interests for the resolved user and maps rows to category_id array", async () => {
    const result = await getMyInterests();

    expect(mockFrom).toHaveBeenCalledWith("user_interests");
    expect(mockSelect).toHaveBeenCalledWith("category_id");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual(["cat-1", "cat-3"]);
  });

  it("uses the provided userId instead of auth.getUser", async () => {
    await getMyInterests("user-99");

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-99");
  });

  it("returns empty array when user has no interests", async () => {
    mockEq.mockResolvedValue({ data: [], error: null });

    const result = await getMyInterests();

    expect(result).toEqual([]);
  });

  it("returns empty array when data is null without error", async () => {
    mockEq.mockResolvedValue({ data: null, error: null });

    const result = await getMyInterests();

    expect(result).toEqual([]);
  });

  it("throws when user is not authenticated and userId is omitted", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(getMyInterests()).rejects.toThrow("Tenés que iniciar sesión");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("throws a descriptive error on Supabase failure", async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: "RLS denied" } });

    await expect(getMyInterests()).rejects.toThrow("Failed to fetch interests: RLS denied");
  });
});

// ─── setMyInterests ────────────────────────────────────────────────────────
describe("setMyInterests", () => {
  // delete chain: from("user_interests").delete().eq("user_id", userId)
  const mockDeleteEq = vi.fn();
  const mockDeleteInstance = vi.fn();

  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockDeleteEq.mockResolvedValue({ error: null });
    mockDeleteInstance.mockReturnValue({ eq: mockDeleteEq });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_interests") {
        return {
          delete: mockDeleteInstance,
          insert: mockInsert,
        };
      }
      return {};
    });
  });

  it("deletes all existing interests then inserts the new set", async () => {
    await setMyInterests(["cat-1", "cat-2"]);

    expect(mockDeleteInstance).toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockInsert).toHaveBeenCalledWith([
      { user_id: "user-1", category_id: "cat-1" },
      { user_id: "user-1", category_id: "cat-2" },
    ]);
  });

  it("deletes all existing interests and skips insert when given empty array (clear)", async () => {
    await setMyInterests([]);

    expect(mockDeleteEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("deduplicates categoryIds before inserting", async () => {
    await setMyInterests(["cat-1", "cat-1", "cat-2", "cat-2"]);

    expect(mockInsert).toHaveBeenCalledWith([
      { user_id: "user-1", category_id: "cat-1" },
      { user_id: "user-1", category_id: "cat-2" },
    ]);
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(setMyInterests(["cat-1"])).rejects.toThrow("Tenés que iniciar sesión");
    expect(mockDeleteInstance).not.toHaveBeenCalled();
  });

  it("throws a descriptive error when delete fails", async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: "Delete denied" } });

    await expect(setMyInterests(["cat-1"])).rejects.toThrow("Failed to update interests: Delete denied");
  });

  it("throws a descriptive error when insert fails", async () => {
    mockInsert.mockResolvedValue({ error: { message: "Insert denied" } });

    await expect(setMyInterests(["cat-1"])).rejects.toThrow("Failed to update interests: Insert denied");
  });
});
