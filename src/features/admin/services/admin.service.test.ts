import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFlyer } from "./admin.service";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
  mockFrom.mockReturnValue({ insert: mockInsert });
});

// ─── createFlyer ───────────────────────────────────────────────────────────
describe("createFlyer", () => {
  it("inserts required fields (image_url, title, address, status)", async () => {
    await createFlyer({
      image_url: "https://cdn.example.com/flyer.jpg",
      title: "Techno Night",
      address: "Calle 123, Buenos Aires",
      status: "pending",
    });

    expect(mockFrom).toHaveBeenCalledWith("flyers");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Techno Night",
        image_url: "https://cdn.example.com/flyer.jpg",
        address: "Calle 123, Buenos Aires",
        status: "pending",
      })
    );
  });

  it("builds PostGIS location when lat/lng are provided", async () => {
    await createFlyer({
      image_url: "https://cdn.example.com/flyer.jpg",
      title: "Techno Night",
      address: "Calle 123",
      status: "pending",
      latitude: -34.6037,
      longitude: -58.3816,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "SRID=4326;POINT(-58.3816 -34.6037)",
      })
    );
  });

  it("omits location when lat/lng are not provided", async () => {
    await createFlyer({
      image_url: "https://cdn.example.com/flyer.jpg",
      title: "No Location",
      address: "No address",
      status: "approved",
    });

    const callArg = mockInsert.mock.calls[0][0];
    expect(callArg).not.toHaveProperty("location");
  });

  it("persists community_id when provided", async () => {
    await createFlyer({
      image_url: "https://cdn.example.com/flyer.jpg",
      title: "Cave Event",
      address: "Calle 456",
      status: "approved",
      community_id: "comm-1",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ community_id: "comm-1" })
    );
  });

  it("omits community_id when not provided (backward compat)", async () => {
    await createFlyer({
      image_url: "https://cdn.example.com/flyer.jpg",
      title: "Legacy Flyer",
      address: "Somewhere",
      status: "pending",
    });

    const callArg = mockInsert.mock.calls[0][0];
    expect(callArg).not.toHaveProperty("community_id");
  });

  it("persists event_date and event_time when provided", async () => {
    await createFlyer({
      image_url: "https://cdn.example.com/flyer.jpg",
      title: "Dated Event",
      address: "Venue X",
      status: "approved",
      event_date: "2026-08-15",
      event_time: "22:00:00",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_date: "2026-08-15",
        event_time: "22:00:00",
      })
    );
  });

  it("omits event_date / event_time when not provided (backward compat)", async () => {
    await createFlyer({
      image_url: "https://cdn.example.com/flyer.jpg",
      title: "No Date",
      address: "Somewhere",
      status: "pending",
    });

    const callArg = mockInsert.mock.calls[0][0];
    expect(callArg).not.toHaveProperty("event_date");
    expect(callArg).not.toHaveProperty("event_time");
  });

  it("persists all optional fields together", async () => {
    await createFlyer({
      image_url: "https://cdn.example.com/flyer.jpg",
      title: "Full Event",
      address: "Club Nocturno",
      status: "approved",
      latitude: -34.6037,
      longitude: -58.3816,
      community_id: "comm-2",
      event_date: "2026-09-01",
      event_time: "23:00:00",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Full Event",
        location: "SRID=4326;POINT(-58.3816 -34.6037)",
        community_id: "comm-2",
        event_date: "2026-09-01",
        event_time: "23:00:00",
      })
    );
  });

  it("throws on Supabase error", async () => {
    mockInsert.mockResolvedValue({ error: { message: "RLS denied" } });

    await expect(
      createFlyer({
        image_url: "https://cdn.example.com/flyer.jpg",
        title: "Failing Flyer",
        address: "Nowhere",
        status: "pending",
      })
    ).rejects.toThrow("RLS denied");
  });
});
