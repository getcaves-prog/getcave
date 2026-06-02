import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchFlyers } from "./search.service";

// Mirror the exact mock pattern from canvas.service.test.ts
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Chain: from().select().or().order().limit()
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockOr.mockReturnValue({ order: mockOrder });
  mockSelect.mockReturnValue({ or: mockOr });
  mockFrom.mockReturnValue({ select: mockSelect });
});

describe("searchFlyers", () => {
  it("returns mapped FlyerSearchResult array for a valid query", async () => {
    const mockData = [
      {
        id: "abc-123",
        title: "Festival de Reggaeton",
        description: "La mejor fiesta del año",
        image_url: "https://example.com/img.jpg",
        event_date: "2026-06-15",
        event_time: "22:00:00",
        address: "Monterrey, NL",
        created_at: "2026-05-01T00:00:00Z",
        status: "approved",
        user_id: "user-1",
      },
    ];
    mockLimit.mockResolvedValue({ data: mockData, error: null });

    const result = await searchFlyers("reggaeton");

    expect(mockFrom).toHaveBeenCalledWith("flyers");
    expect(mockSelect).toHaveBeenCalledWith(
      "id, title, description, image_url, event_date, event_time, address, created_at, status, user_id"
    );
    expect(mockOr).toHaveBeenCalledWith(
      "title.ilike.%reggaeton%,description.ilike.%reggaeton%"
    );
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(30);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("abc-123");
    expect(result[0].title).toBe("Festival de Reggaeton");
    expect(result[0].image_url).toBe("https://example.com/img.jpg");
    expect(result[0].event_date).toBe("2026-06-15");
  });

  it("returns empty array for empty string without hitting network", async () => {
    const result = await searchFlyers("");

    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns empty array for whitespace-only string without hitting network", async () => {
    const result = await searchFlyers("   ");

    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("escapes PostgREST reserved characters (comma and parens) in the query", async () => {
    await searchFlyers("fest(ival,2026)");

    expect(mockOr).toHaveBeenCalledWith(
      "title.ilike.%festival2026%,description.ilike.%festival2026%"
    );
  });

  it("respects a custom limit option", async () => {
    await searchFlyers("techno", { limit: 10 });

    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("trims whitespace from query before sending to network", async () => {
    await searchFlyers("  cumbia  ");

    expect(mockOr).toHaveBeenCalledWith(
      "title.ilike.%cumbia%,description.ilike.%cumbia%"
    );
  });

  it("throws with a descriptive message when Supabase returns an error", async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: "DB error" } });

    await expect(searchFlyers("techno")).rejects.toThrow(
      "Failed to search flyers: DB error"
    );
  });

  it("returns empty array when Supabase returns null data without error", async () => {
    mockLimit.mockResolvedValue({ data: null, error: null });

    const result = await searchFlyers("techno");

    expect(result).toEqual([]);
  });
});
