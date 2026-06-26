import { describe, it, expect, vi, beforeEach } from "vitest";

const { scrapeEventsMock, getCachedMock, setCachedMock } = vi.hoisted(() => ({
  scrapeEventsMock: vi.fn(),
  getCachedMock: vi.fn(),
  setCachedMock: vi.fn(),
}));

vi.mock("@/features/discover/services/apify.service", () => ({
  scrapeEvents: scrapeEventsMock,
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
    expect(scrapeEventsMock).toHaveBeenCalledWith({
      query: "Techno",
      city: "Monterrey",
    });
    expect(setCachedMock).toHaveBeenCalledWith("techno|monterrey", flyers);
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
