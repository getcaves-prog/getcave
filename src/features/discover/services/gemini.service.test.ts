import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enrichFlyersWithGemini } from "./gemini.service";
import { createScrapedFlyer } from "@/features/discover/types/discover.types";
import type { ScrapedFlyer } from "@/features/discover/types/discover.types";

function igFlyer(overrides: Partial<Parameters<typeof createScrapedFlyer>[0]> = {}) {
  return createScrapedFlyer({
    id: `scraped:instagram:${Math.random().toString(36).slice(2)}`,
    source: "instagram",
    title: "noisy caption first line",
    image_url: "https://cdn/a.jpg",
    external_url: "https://instagram.com/p/x",
    event_date: "2026-06-01", // POST date fallback (heuristic)
    event_time: null,
    address: "Parque Fundidora",
    description: "Fiesta techno!! 12 de julio 22hs en Club Vibra 🔥 #rave",
    ...overrides,
  });
}

/** Build a Gemini generateContent response wrapping a JSON-array text part. */
function geminiResponse(arr: unknown) {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(arr) }] } },
      ],
    }),
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

describe("enrichFlyersWithGemini", () => {
  it("returns flyers unchanged and never fetches when GEMINI_API_KEY is missing", async () => {
    const flyers = [igFlyer()];
    const result = await enrichFlyersWithGemini(flyers);

    expect(result).toEqual(flyers);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls generateContent with the configured model and JSON responseSchema", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    fetchMock.mockResolvedValue(geminiResponse([]));

    await enrichFlyersWithGemini([igFlyer()]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    );
    expect(url).toContain("key=key-123");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0].text).toEqual(expect.any(String));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema.type).toBe("ARRAY");
  });

  it("defaults the model to gemini-2.5-flash when GEMINI_MODEL is unset", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    fetchMock.mockResolvedValue(geminiResponse([]));

    await enrichFlyersWithGemini([igFlyer()]);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("models/gemini-2.5-flash:generateContent");
  });

  it("merges Gemini fields back into flyers by index", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    const flyer = igFlyer({ event_date: "2026-06-01", address: "Parque Fundidora" });
    fetchMock.mockResolvedValue(
      geminiResponse([
        {
          index: 0,
          title: "Rave Techno",
          event_date: "2026-07-12",
          event_time: "22:00",
          place: "Club Vibra",
          category: "music",
        },
      ])
    );

    const [result] = await enrichFlyersWithGemini([flyer]);

    expect(result.title).toBe("Rave Techno");
    expect(result.event_date).toBe("2026-07-12");
    expect(result.event_time).toBe("22:00");
    expect(result.address).toBe("Club Vibra");
  });

  it("does not clobber existing values with null fields from Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    const flyer = igFlyer({
      title: "keep title",
      event_date: "2026-06-01",
      event_time: "20:00",
      address: "Parque Fundidora",
    });
    fetchMock.mockResolvedValue(
      geminiResponse([
        {
          index: 0,
          title: null,
          event_date: null,
          event_time: null,
          place: null,
          category: null,
        },
      ])
    );

    const [result] = await enrichFlyersWithGemini([flyer]);

    expect(result.title).toBe("keep title");
    expect(result.event_date).toBe("2026-06-01");
    expect(result.event_time).toBe("20:00");
    expect(result.address).toBe("Parque Fundidora");
  });

  it("returns flyers unchanged when Gemini returns malformed JSON", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    const flyers = [igFlyer()];
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not json {{{" }] } }],
      }),
    });

    const result = await enrichFlyersWithGemini(flyers);
    expect(result).toEqual(flyers);
  });

  it("returns flyers unchanged when fetch throws (timeout/network)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    const flyers = [igFlyer()];
    fetchMock.mockRejectedValue(new Error("aborted"));

    const result = await enrichFlyersWithGemini(flyers);
    expect(result).toEqual(flyers);
  });

  it("returns flyers unchanged when the response is not ok", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    const flyers = [igFlyer()];
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    const result = await enrichFlyersWithGemini(flyers);
    expect(result).toEqual(flyers);
  });

  it("leaves flyers without a description as-is and excludes them from the prompt", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    const withDesc = igFlyer({ description: "12 julio en Club Vibra" });
    const noDesc = igFlyer({ description: null, title: "no caption" });
    // Gemini sees only one item -> index 0 maps to the described flyer.
    fetchMock.mockResolvedValue(
      geminiResponse([{ index: 0, title: "Enriched", event_date: "2026-07-12" }])
    );

    const result = await enrichFlyersWithGemini([withDesc, noDesc]);

    expect(result[0].title).toBe("Enriched");
    expect(result[0].event_date).toBe("2026-07-12");
    // The no-description flyer is untouched.
    expect(result[1].title).toBe("no caption");
  });

  it("returns flyers unchanged (no fetch) when there are no descriptions to enrich", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    const flyers: ScrapedFlyer[] = [igFlyer({ description: null })];

    const result = await enrichFlyersWithGemini(flyers);

    expect(result).toEqual(flyers);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caps the batch at 30 described flyers in the prompt", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    fetchMock.mockResolvedValue(geminiResponse([]));

    const flyers = Array.from({ length: 35 }, (_, i) =>
      igFlyer({ description: `caption ${i}` })
    );

    await enrichFlyersWithGemini(flyers);

    const [, init] = fetchMock.mock.calls[0];
    const text = JSON.parse(init.body).contents[0].parts[0].text as string;
    // 30 numbered entries -> "30." present, "31." absent.
    expect(text).toContain("30.");
    expect(text).not.toContain("31.");
  });

  it("ignores Gemini items whose index is out of range", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    const flyer = igFlyer({ title: "original" });
    fetchMock.mockResolvedValue(
      geminiResponse([{ index: 99, title: "ghost" }])
    );

    const [result] = await enrichFlyersWithGemini([flyer]);
    expect(result.title).toBe("original");
  });
});
