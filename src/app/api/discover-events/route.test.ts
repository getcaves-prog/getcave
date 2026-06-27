import { describe, it, expect, vi, beforeEach } from "vitest";

const { scrapeEventsMock, getCachedMock, setCachedMock } = vi.hoisted(() => ({
  scrapeEventsMock: vi.fn(),
  getCachedMock: vi.fn(),
  setCachedMock: vi.fn(),
}));

vi.mock("@/features/discover/services/apify.service", () => ({
  scrapeEvents: scrapeEventsMock,
  // Real-ish filter: drop FB events outside the radius; keep everything else.
  // Mirrors the production contract closely enough for route assertions.
  filterByLocation: (
    flyers: Array<{ _lat?: number; _city?: string }>,
    { lat, city }: { city?: string; lat?: number; lng?: number }
  ) => {
    if (typeof lat !== "number") return flyers;
    return flyers.filter((f) => {
      if (typeof f._lat === "number") return Math.abs(f._lat - lat) < 1;
      if (f._city && city) return f._city.toLowerCase() === city.toLowerCase();
      return true;
    });
  },
}));

vi.mock("@/features/discover/services/cache", () => ({
  getCached: getCachedMock,
  setCached: setCachedMock,
  makeCacheKey: (q: string, c?: string) =>
    `${q.trim().toLowerCase()}|${(c ?? "").trim().toLowerCase()}`,
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/discover-events", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  getCachedMock.mockReturnValue(undefined);
});

describe("POST /api/discover-events", () => {
  it("returns events:[] with source 'off' when no APIFY_TOKEN", async () => {
    scrapeEventsMock.mockResolvedValue([]);

    const res = await POST(makeRequest({ query: "techno" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.events).toEqual([]);
    expect(json.source).toBe("off");
  });

  it("returns events:[] for an empty query without scraping", async () => {
    const res = await POST(makeRequest({ query: "   " }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.events).toEqual([]);
    expect(scrapeEventsMock).not.toHaveBeenCalled();
  });

  it("returns events:[] for a missing query", async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.events).toEqual([]);
    expect(scrapeEventsMock).not.toHaveBeenCalled();
  });

  it("scrapes, caches, and returns events when token is set", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    const flyers = [{ id: "scraped:facebook:abc", source: "facebook" }];
    scrapeEventsMock.mockResolvedValue(flyers);

    const res = await POST(
      makeRequest({ query: "Techno", city: "Monterrey" })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.events).toEqual(flyers);
    expect(json.cached).toBe(false);
    expect(json.source).toBe("apify");
    // RAW scrape (no coords) so the cache is shared across nearby users.
    expect(scrapeEventsMock).toHaveBeenCalledWith({
      query: "Techno",
      city: "Monterrey",
    });
    // The cache stores the RAW (unfiltered) scrape.
    expect(setCachedMock).toHaveBeenCalledWith("techno|monterrey", flyers);
  });

  it("filters the fresh scrape per-request by user coords", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    // Two FB events: one near the user (lat≈7.8) and one far (lat≈40).
    const raw = [
      { id: "near", _lat: 7.89 },
      { id: "far", _lat: 40.4 },
    ];
    scrapeEventsMock.mockResolvedValue(raw);

    const res = await POST(
      makeRequest({ query: "salsa", city: "Cúcuta", lat: 7.8939, lng: -72.5078 })
    );
    const json = await res.json();

    // The full raw set is cached; only the near event is returned.
    expect(setCachedMock).toHaveBeenCalledWith("salsa|cúcuta", raw);
    expect(json.events.map((e: { id: string }) => e.id)).toEqual(["near"]);
  });

  it("filters a CACHE HIT per-request (cache holds raw, filter after)", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    const cachedRaw = [
      { id: "near", _lat: 7.89 },
      { id: "far", _lat: 40.4 },
    ];
    getCachedMock.mockReturnValue(cachedRaw);

    const res = await POST(
      makeRequest({ query: "salsa", lat: 7.8939, lng: -72.5078 })
    );
    const json = await res.json();

    expect(scrapeEventsMock).not.toHaveBeenCalled();
    expect(json.cached).toBe(true);
    expect(json.events.map((e: { id: string }) => e.id)).toEqual(["near"]);
  });

  it("ignores non-numeric lat/lng (no filtering applied)", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    const raw = [
      { id: "near", _lat: 7.89 },
      { id: "far", _lat: 40.4 },
    ];
    scrapeEventsMock.mockResolvedValue(raw);

    const res = await POST(makeRequest({ query: "salsa", lat: "x", lng: null }));
    const json = await res.json();

    // No coords → no filter → both events returned.
    expect(json.events.map((e: { id: string }) => e.id)).toEqual([
      "near",
      "far",
    ]);
  });

  it("returns cached events without scraping on a cache hit", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    const cached = [{ id: "scraped:instagram:xyz", source: "instagram" }];
    getCachedMock.mockReturnValue(cached);

    const res = await POST(makeRequest({ query: "techno" }));
    const json = await res.json();

    expect(json.events).toEqual(cached);
    expect(json.cached).toBe(true);
    expect(json.source).toBe("apify");
    expect(scrapeEventsMock).not.toHaveBeenCalled();
  });

  it("never 500s — returns events:[] when scrapeEvents throws", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    scrapeEventsMock.mockRejectedValue(new Error("boom"));

    const res = await POST(makeRequest({ query: "techno" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.events).toEqual([]);
  });

  it("never 500s — returns events:[] on invalid JSON body", async () => {
    const badReq = new Request("http://localhost/api/discover-events", {
      method: "POST",
      body: "{not json",
      headers: { "content-type": "application/json" },
    });

    const res = await POST(badReq);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.events).toEqual([]);
  });

  it("rejects an over-long query (returns empty, no scrape)", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    const res = await POST(makeRequest({ query: "x".repeat(300) }));
    const json = await res.json();

    expect(json.events).toEqual([]);
    expect(scrapeEventsMock).not.toHaveBeenCalled();
  });
});
