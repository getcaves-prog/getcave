import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runApifyActor, scrapeEvents, toHashtag } from "./apify.service";

// Realistic facebook-events-scraper item.
function fbItem(overrides: Record<string, unknown> = {}) {
  return {
    name: "FB Event",
    imageUrl: "https://scontent.fbcdn.net/a.jpg",
    url: "https://facebook.com/events/1",
    utcStartDate: "2026-07-01T22:00:00.000Z",
    startTime: "22:00",
    address: "Club Vibra, Monterrey",
    isCanceled: false,
    isPast: false,
    ...overrides,
  };
}

// Realistic instagram-hashtag-scraper item.
function igItem(overrides: Record<string, unknown> = {}) {
  return {
    caption: "IG Post line one\nmore text",
    displayUrl: "https://cdninstagram.com/b.jpg",
    url: "https://instagram.com/p/2",
    timestamp: "2026-06-01T10:00:00.000Z",
    locationName: "Parque Fundidora",
    ownerUsername: "promoter",
    type: "Image",
    shortCode: "abc",
    images: [],
    ...overrides,
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("runApifyActor", () => {
  it("POSTs to run-sync-get-dataset-items with the token and returns items", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    const items = [{ name: "A" }, { name: "B" }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => items,
    });

    const result = await runApifyActor("acme~actor", { search: "x" });

    expect(result).toEqual(items);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(
      "https://api.apify.com/v2/acts/acme~actor/run-sync-get-dataset-items"
    );
    expect(url).toContain("token=tok-123");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ search: "x" });
  });

  it("returns [] when APIFY_TOKEN is missing", async () => {
    const result = await runApifyActor("acme~actor", { search: "x" });
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns [] when the response is not ok", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    expect(await runApifyActor("a", {})).toEqual([]);
  });

  it("returns [] when fetch throws (network/timeout)", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    fetchMock.mockRejectedValue(new Error("aborted"));

    expect(await runApifyActor("a", {})).toEqual([]);
  });

  it("returns [] when the response body is not an array", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ foo: 1 }) });

    expect(await runApifyActor("a", {})).toEqual([]);
  });
});

describe("toHashtag", () => {
  it("lowercases, strips accents, removes spaces and non-alphanumerics", () => {
    expect(toHashtag("Techno Montería")).toBe("technomonteria");
  });

  it("drops a leading '#' and punctuation", () => {
    expect(toHashtag("#Cumbia! Fest")).toBe("cumbiafest");
  });

  it("returns '' when nothing usable remains", () => {
    expect(toHashtag("   !!!  ")).toBe("");
  });
});

describe("scrapeEvents", () => {
  it("returns [] when APIFY_TOKEN is missing (feature off)", async () => {
    const result = await scrapeEvents({ query: "techno" });
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends FB searchQueries and IG hashtags with the right shapes", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");

    fetchMock.mockImplementation((url: string) => {
      const body = url.includes("fb~actor") ? [fbItem()] : [igItem()];
      return Promise.resolve({ ok: true, json: async () => body });
    });

    await scrapeEvents({ query: "techno", city: "Monterrey" });

    const fbCall = fetchMock.mock.calls.find((c) =>
      (c[0] as string).includes("fb~actor")
    );
    const igCall = fetchMock.mock.calls.find((c) =>
      (c[0] as string).includes("ig~actor")
    );

    expect(JSON.parse(fbCall![1].body)).toEqual({
      searchQueries: ["techno Monterrey"],
      maxEvents: 30,
    });
    expect(JSON.parse(igCall![1].body)).toEqual({
      hashtags: ["technomonterrey"],
      resultsType: "posts",
      resultsLimit: 30,
    });
  });

  it("omits city from the FB search text when not provided", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");

    fetchMock.mockResolvedValue({ ok: true, json: async () => [fbItem()] });

    await scrapeEvents({ query: "techno" });

    const fbCall = fetchMock.mock.calls[0];
    expect(JSON.parse(fbCall[1].body)).toEqual({
      searchQueries: ["techno"],
      maxEvents: 30,
    });
  });

  it("skips IG entirely when the query yields an empty hashtag", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");

    fetchMock.mockResolvedValue({ ok: true, json: async () => [fbItem()] });

    await scrapeEvents({ query: "!!!" });

    const igCalled = fetchMock.mock.calls.some((c) =>
      (c[0] as string).includes("ig~actor")
    );
    expect(igCalled).toBe(false);
  });

  it("runs both actors and returns normalized, deduped flyers", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");

    fetchMock.mockImplementation((url: string) => {
      const body = url.includes("fb~actor") ? [fbItem()] : [igItem()];
      return Promise.resolve({ ok: true, json: async () => body });
    });

    const result = await scrapeEvents({ query: "techno", city: "Monterrey" });

    expect(result).toHaveLength(2);
    const sources = result.map((r) => r.source).sort();
    expect(sources).toEqual(["facebook", "instagram"]);
  });

  it("returns the surviving actor's results when one actor fails", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");

    fetchMock.mockImplementation((url: string) => {
      if (url.includes("fb~actor")) {
        return Promise.reject(new Error("fb down"));
      }
      return Promise.resolve({
        ok: true,
        json: async () => [igItem({ url: "https://instagram.com/p/9" })],
      });
    });

    const result = await scrapeEvents({ query: "techno" });
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("instagram");
  });

  it("dedupes flyers with the same synthetic id", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");

    // FB actor returns the SAME event twice -> same synthetic id -> deduped.
    const dup = fbItem({ url: "https://facebook.com/events/dup" });
    fetchMock.mockImplementation((url: string) => {
      const body = url.includes("fb~actor") ? [dup, dup] : [];
      return Promise.resolve({ ok: true, json: async () => body });
    });

    const result = await scrapeEvents({ query: "techno" });
    expect(result).toHaveLength(1);
  });

  it("does NOT filter by location when no user coords are provided", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");

    // A FB event in Madrid (far from anything) — must survive without coords.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        fbItem({
          url: "https://facebook.com/events/madrid",
          location: { name: "Sala", latitude: 40.4168, longitude: -3.7038 },
        }),
      ],
    });

    const result = await scrapeEvents({ query: "salsa" });
    expect(result).toHaveLength(1);
  });

  it("keeps FB events within the radius and drops far ones (Haversine)", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        fbItem({
          name: "Near Event",
          url: "https://facebook.com/events/near",
          location: { name: "Local", latitude: 25.69, longitude: -100.31 },
        }),
        fbItem({
          name: "Far Event",
          url: "https://facebook.com/events/far",
          location: { name: "Madrid", latitude: 40.4168, longitude: -3.7038 },
        }),
      ],
    });

    // User in Monterrey.
    const result = await scrapeEvents({
      query: "salsa",
      lat: 25.6866,
      lng: -100.3161,
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Near Event");
  });

  it("keeps FB events with NO coords when coords filter is active", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        fbItem({
          url: "https://facebook.com/events/nocoords",
          location: { name: "Somewhere", city: "Unknown" },
        }),
      ],
    });

    // No coords on the event and no Gemini city → uncertain → kept.
    const result = await scrapeEvents({
      query: "salsa",
      lat: 25.6866,
      lng: -100.3161,
      city: "Monterrey",
    });
    expect(result).toHaveLength(1);
  });

  it("drops IG posts whose Gemini city does not match the user city", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");
    vi.stubEnv("GEMINI_API_KEY", "gkey");

    fetchMock.mockImplementation((url: string) => {
      if (url.includes("ig~actor")) {
        return Promise.resolve({
          ok: true,
          json: async () => [igItem({ url: "https://instagram.com/p/spain" })],
        });
      }
      // Gemini: detected city = Madrid (mismatch vs user's Monterrey).
      return Promise.resolve({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: JSON.stringify([{ index: 0, city: "Madrid" }]) },
                ],
              },
            },
          ],
        }),
      });
    });

    const result = await scrapeEvents({
      query: "salsa",
      city: "Monterrey",
      lat: 25.6866,
      lng: -100.3161,
    });
    expect(result).toEqual([]);
  });

  it("keeps IG posts whose Gemini city matches the user city (contains-match)", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");
    vi.stubEnv("GEMINI_API_KEY", "gkey");

    fetchMock.mockImplementation((url: string) => {
      if (url.includes("ig~actor")) {
        return Promise.resolve({
          ok: true,
          json: async () => [igItem({ url: "https://instagram.com/p/mty" })],
        });
      }
      // Accent/case-insensitive: "Monterrey, N.L." contains "Monterrey".
      return Promise.resolve({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify([
                      { index: 0, city: "Monterrey, N.L." },
                    ]),
                  },
                ],
              },
            },
          ],
        }),
      });
    });

    const result = await scrapeEvents({
      query: "salsa",
      city: "Montérrey",
      lat: 25.6866,
      lng: -100.3161,
    });
    expect(result).toHaveLength(1);
  });

  it("keeps IG posts when Gemini returns no city (uncertain stays)", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");
    vi.stubEnv("GEMINI_API_KEY", "gkey");

    fetchMock.mockImplementation((url: string) => {
      if (url.includes("ig~actor")) {
        return Promise.resolve({
          ok: true,
          json: async () => [igItem({ url: "https://instagram.com/p/unknown" })],
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify([{ index: 0, city: null }]) }],
              },
            },
          ],
        }),
      });
    });

    const result = await scrapeEvents({
      query: "salsa",
      city: "Monterrey",
      lat: 25.6866,
      lng: -100.3161,
    });
    expect(result).toHaveLength(1);
  });

  it("drops un-normalizable items (canceled FB event)", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");

    fetchMock.mockImplementation((url: string) => {
      const body = url.includes("fb~actor")
        ? [fbItem({ isCanceled: true })]
        : [];
      return Promise.resolve({ ok: true, json: async () => body });
    });

    const result = await scrapeEvents({ query: "techno" });
    expect(result).toEqual([]);
  });
});
