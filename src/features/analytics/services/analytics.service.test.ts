import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCreatorAnalytics } from "./analytics.service";

// ─── Mock the underlying metric/profile services ────────────────────────────
vi.mock("@/features/profile/services/profile.service", () => ({
  getUserFlyers: vi.fn(),
}));
vi.mock("@/features/canvas/services/views.service", () => ({
  getFlyerViewCount: vi.fn(),
}));
vi.mock("@/features/canvas/services/attendance.service", () => ({
  getAttendance: vi.fn(),
}));
vi.mock("@/features/canvas/services/favorites.service", () => ({
  getFlyerSaveCount: vi.fn(),
}));

import { getUserFlyers } from "@/features/profile/services/profile.service";
import { getFlyerViewCount } from "@/features/canvas/services/views.service";
import { getAttendance } from "@/features/canvas/services/attendance.service";
import { getFlyerSaveCount } from "@/features/canvas/services/favorites.service";

const mockGetUserFlyers = vi.mocked(getUserFlyers);
const mockGetFlyerViewCount = vi.mocked(getFlyerViewCount);
const mockGetAttendance = vi.mocked(getAttendance);
const mockGetFlyerSaveCount = vi.mocked(getFlyerSaveCount);

// Minimal flyer factory matching Tables<"flyers">
function makeFlyer(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "f1",
    title: "Show",
    image_url: "https://img/1.png",
    event_date: "2026-07-01",
    address: null,
    canvas_x: 0,
    canvas_y: 0,
    community_id: null,
    created_at: "2026-01-01",
    description: null,
    duration_days: null,
    event_time: null,
    expires_at: null,
    height: 100,
    is_promoted: null,
    location: null,
    promoted_until: null,
    rotation: 0,
    social_copy: null,
    status: "approved",
    user_id: "u1",
    width: 100,
    ...over,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCreatorAnalytics", () => {
  it("returns zeros and empty list when the user has no flyers", async () => {
    mockGetUserFlyers.mockResolvedValue([]);

    const result = await getCreatorAnalytics("u1");

    expect(result.totals).toEqual({
      flyers: 0,
      views: 0,
      attendees: 0,
      saves: 0,
    });
    expect(result.flyers).toEqual([]);
    expect(mockGetFlyerViewCount).not.toHaveBeenCalled();
  });

  it("maps per-flyer metrics and sums totals", async () => {
    mockGetUserFlyers.mockResolvedValue([
      makeFlyer({ id: "f1", title: "A" }),
      makeFlyer({ id: "f2", title: "B" }),
    ]);

    mockGetFlyerViewCount.mockImplementation(async (id: string) =>
      id === "f1" ? 10 : 30
    );
    mockGetAttendance.mockImplementation(async (id: string) => ({
      counts: { total: id === "f1" ? 4 : 6, solo: id === "f1" ? 1 : 2 },
      mine: { going: false, goingSolo: false },
    }));
    mockGetFlyerSaveCount.mockImplementation(async (id: string) =>
      id === "f1" ? 5 : 7
    );

    const result = await getCreatorAnalytics("u1");

    expect(result.totals).toEqual({
      flyers: 2,
      views: 40,
      attendees: 10,
      saves: 12,
    });

    // Sorted by views desc → f2 first
    expect(result.flyers.map((f) => f.id)).toEqual(["f2", "f1"]);

    const f1 = result.flyers.find((f) => f.id === "f1")!;
    expect(f1).toMatchObject({
      id: "f1",
      title: "A",
      image_url: "https://img/1.png",
      event_date: "2026-07-01",
      views: 10,
      attendees: 4,
      soloAttendees: 1,
      saves: 5,
    });
  });

  it("sorts flyers by views descending", async () => {
    mockGetUserFlyers.mockResolvedValue([
      makeFlyer({ id: "low" }),
      makeFlyer({ id: "high" }),
      makeFlyer({ id: "mid" }),
    ]);
    mockGetFlyerViewCount.mockImplementation(async (id: string) =>
      id === "high" ? 100 : id === "mid" ? 50 : 1
    );
    mockGetAttendance.mockResolvedValue({
      counts: { total: 0, solo: 0 },
      mine: { going: false, goingSolo: false },
    });
    mockGetFlyerSaveCount.mockResolvedValue(0);

    const result = await getCreatorAnalytics("u1");

    expect(result.flyers.map((f) => f.id)).toEqual(["high", "mid", "low"]);
  });

  it("is resilient: a single failing metric resolves to 0, never throws", async () => {
    mockGetUserFlyers.mockResolvedValue([makeFlyer({ id: "f1" })]);
    mockGetFlyerViewCount.mockRejectedValue(new Error("views down"));
    mockGetAttendance.mockRejectedValue(new Error("attendance down"));
    mockGetFlyerSaveCount.mockResolvedValue(9);

    const result = await getCreatorAnalytics("u1");

    const f1 = result.flyers[0];
    expect(f1.views).toBe(0);
    expect(f1.attendees).toBe(0);
    expect(f1.soloAttendees).toBe(0);
    expect(f1.saves).toBe(9);
    expect(result.totals).toEqual({
      flyers: 1,
      views: 0,
      attendees: 0,
      saves: 9,
    });
  });

  it("caps the number of flyers processed at 100", async () => {
    const many = Array.from({ length: 150 }, (_, i) =>
      makeFlyer({ id: `f${i}` })
    );
    mockGetUserFlyers.mockResolvedValue(many);
    mockGetFlyerViewCount.mockResolvedValue(1);
    mockGetAttendance.mockResolvedValue({
      counts: { total: 0, solo: 0 },
      mine: { going: false, goingSolo: false },
    });
    mockGetFlyerSaveCount.mockResolvedValue(0);

    const result = await getCreatorAnalytics("u1");

    expect(result.flyers).toHaveLength(100);
    expect(result.totals.flyers).toBe(100);
  });

  it("falls back to null title when flyer has no title", async () => {
    mockGetUserFlyers.mockResolvedValue([makeFlyer({ id: "f1", title: null })]);
    mockGetFlyerViewCount.mockResolvedValue(0);
    mockGetAttendance.mockResolvedValue({
      counts: { total: 0, solo: 0 },
      mine: { going: false, goingSolo: false },
    });
    mockGetFlyerSaveCount.mockResolvedValue(0);

    const result = await getCreatorAnalytics("u1");

    expect(result.flyers[0].title).toBeNull();
  });
});
