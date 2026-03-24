import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import { createEvent, getCategories } from "./upload.service";
import type { CreateEventData } from "./upload.service";

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockOrder = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table: string) => {
        if (table === "events") {
          return { insert: mockInsert };
        }
        if (table === "categories") {
          return {
            select: vi.fn(() => ({
              order: mockOrder,
            })),
          };
        }
        return {};
      }),
    })
  ),
}));

const mockEventData: CreateEventData = {
  title: "Test Party",
  description: "A cool party",
  flyerUrl: "https://example.com/flyer.jpg",
  venueName: "Test Venue",
  venueAddress: "123 Test St",
  latitude: 19.4326,
  longitude: -99.1332,
  date: "2026-04-01",
  timeStart: "21:00",
  timeEnd: "03:00",
  price: 200,
  currency: "MXN",
  categoryId: "cat-1",
  externalUrl: "https://tickets.com/test",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ single: mockSingle });
});

describe("createEvent", () => {
  it("should check authentication before creating event", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const result = await createEvent(mockEventData);

    expect(result).toEqual({ error: "Not authenticated" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should return error when user is null without auth error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await createEvent(mockEventData);

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("should insert event with correct data and redirect on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { id: "evt-new" },
      error: null,
    });

    await createEvent(mockEventData);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        category_id: "cat-1",
        title: "Test Party",
        description: "A cool party",
        flyer_url: "https://example.com/flyer.jpg",
        venue_name: "Test Venue",
        venue_address: "123 Test St",
        location: "POINT(-99.1332 19.4326)",
        date: "2026-04-01",
        time_start: "21:00",
        time_end: "03:00",
        price: 200,
        currency: "MXN",
        external_url: "https://tickets.com/test",
        status: "active",
      })
    );
    expect(redirect).toHaveBeenCalledWith("/event/evt-new");
  });

  it("should handle null optional fields correctly", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { id: "evt-new" },
      error: null,
    });

    const minimalData: CreateEventData = {
      ...mockEventData,
      description: "",
      timeEnd: null,
      price: null,
      externalUrl: null,
    };

    await createEvent(minimalData);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
        time_end: null,
        price: null,
        external_url: null,
      })
    );
  });

  it("should default currency to MXN when empty", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { id: "evt-new" },
      error: null,
    });

    const dataWithEmptyCurrency: CreateEventData = {
      ...mockEventData,
      currency: "",
    };

    await createEvent(dataWithEmptyCurrency);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: "MXN",
      })
    );
  });

  it("should return error on insert failure", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Duplicate title" },
    });

    const result = await createEvent(mockEventData);

    expect(result).toEqual({ error: "Duplicate title" });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("getCategories", () => {
  it("should return categories ordered by name", async () => {
    const mockCategories = [
      { id: "1", name: "Electronic", slug: "electronic", icon: "🎧" },
      { id: "2", name: "Music", slug: "music", icon: "🎵" },
    ];
    mockOrder.mockResolvedValue({ data: mockCategories });

    const result = await getCategories();

    expect(result).toEqual(mockCategories);
  });

  it("should return empty array when data is null", async () => {
    mockOrder.mockResolvedValue({ data: null });

    const result = await getCategories();

    expect(result).toEqual([]);
  });
});
