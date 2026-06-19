import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runApifyActor, scrapeEvents } from "./apify.service";

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

describe("scrapeEvents", () => {
  it("returns [] when APIFY_TOKEN is missing (feature off)", async () => {
    const result = await scrapeEvents({ query: "techno" });
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("runs both actors and returns normalized, deduped flyers", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");

    const fbItems = [
      {
        name: "FB Event",
        imageUrl: "https://scontent.fbcdn.net/a.jpg",
        url: "https://facebook.com/events/1",
      },
    ];
    const igItems = [
      {
        title: "IG Event",
        image: "https://cdninstagram.com/b.jpg",
        eventUrl: "https://instagram.com/p/2",
      },
    ];

    fetchMock.mockImplementation((url: string) => {
      const body = url.includes("fb~actor") ? fbItems : igItems;
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
        json: async () => [
          {
            title: "IG Survives",
            image: "https://cdninstagram.com/s.jpg",
            eventUrl: "https://instagram.com/p/9",
          },
        ],
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
    const dup = {
      name: "Dup Event",
      imageUrl: "https://scontent.fbcdn.net/d.jpg",
      url: "https://facebook.com/events/dup",
    };
    fetchMock.mockImplementation((url: string) => {
      const body = url.includes("fb~actor") ? [dup, dup] : [];
      return Promise.resolve({ ok: true, json: async () => body });
    });

    const result = await scrapeEvents({ query: "techno" });
    expect(result).toHaveLength(1);
  });

  it("drops un-normalizable items (no image)", async () => {
    vi.stubEnv("APIFY_TOKEN", "tok-123");
    vi.stubEnv("APIFY_FB_ACTOR_ID", "fb~actor");
    vi.stubEnv("APIFY_IG_ACTOR_ID", "ig~actor");

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ name: "No Image" }],
    });

    const result = await scrapeEvents({ query: "techno" });
    expect(result).toEqual([]);
  });
});
