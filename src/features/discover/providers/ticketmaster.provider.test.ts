import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchTicketmasterEvents,
  normalizeTicketmasterEvent,
} from "./ticketmaster.provider";
import { ProvidersUnavailableError } from "./provider.types";

// Realistic Ticketmaster Discovery event.
function tmEvent(overrides: Record<string, unknown> = {}) {
  return {
    name: "Bad Bunny en Monterrey",
    id: "vvG1abc123",
    url: "https://www.ticketmaster.com.mx/event/abc",
    images: [
      { ratio: "3_2", url: "https://s1.ticketm.net/small.jpg", width: 305 },
      { ratio: "16_9", url: "https://s1.ticketm.net/wide.jpg", width: 2048 },
    ],
    dates: {
      start: {
        localDate: "2099-07-01",
        localTime: "21:00:00",
        dateTime: "2099-07-02T03:00:00Z",
      },
    },
    classifications: [{ segment: { name: "Music" }, genre: { name: "Latin" } }],
    _embedded: {
      venues: [
        {
          name: "Arena Monterrey",
          city: { name: "Monterrey" },
          location: { latitude: "25.6866", longitude: "-100.3161" },
        },
      ],
    },
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

describe("normalizeTicketmasterEvent", () => {
  it("maps a full event to a ScrapedFlyer", () => {
    const flyer = normalizeTicketmasterEvent(tmEvent());
    expect(flyer).not.toBeNull();
    expect(flyer!.source).toBe("ticketmaster");
    expect(flyer!.title).toBe("Bad Bunny en Monterrey");
    expect(flyer!.id).toMatch(/^scraped:ticketmaster:/);
    expect(flyer!.event_date).toBe("2099-07-01");
    expect(flyer!.event_time).toBe("21:00");
    expect(flyer!.external_url).toBe(
      "https://www.ticketmaster.com.mx/event/abc"
    );
    expect(flyer!.address).toBe("Arena Monterrey, Monterrey");
    expect(flyer!.description).toBe("Music · Latin");
  });

  it("prefers a wide 16:9 image, parses string lat/lng and city", () => {
    const flyer = normalizeTicketmasterEvent(tmEvent());
    expect(flyer!.image_url).toBe("https://s1.ticketm.net/wide.jpg");
    expect(flyer!._lat).toBe(25.6866);
    expect(flyer!._lng).toBe(-100.3161);
    expect(flyer!._city).toBe("Monterrey");
  });

  it("falls back to the first image when no wide 16:9 exists", () => {
    const flyer = normalizeTicketmasterEvent(
      tmEvent({
        images: [{ ratio: "3_2", url: "https://s1.ticketm.net/only.jpg", width: 100 }],
      })
    );
    expect(flyer!.image_url).toBe("https://s1.ticketm.net/only.jpg");
  });

  it("derives event_date from dateTime when localDate is absent", () => {
    const flyer = normalizeTicketmasterEvent(
      tmEvent({ dates: { start: { dateTime: "2099-08-15T01:00:00Z" } } })
    );
    expect(flyer!.event_date).toBe("2099-08-15");
    expect(flyer!.event_time).toBeNull();
  });

  it("returns null when there is no name", () => {
    expect(normalizeTicketmasterEvent(tmEvent({ name: undefined }))).toBeNull();
  });

  it("returns null when there is no usable image", () => {
    expect(normalizeTicketmasterEvent(tmEvent({ images: [] }))).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(normalizeTicketmasterEvent(null)).toBeNull();
    expect(normalizeTicketmasterEvent("nope")).toBeNull();
  });
});

describe("fetchTicketmasterEvents", () => {
  it("returns [] and does not fetch when the API key is missing", async () => {
    const result = await fetchTicketmasterEvents({ query: "techno" });
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds the Discovery URL with apikey, keyword, default MX country, and city", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "tm-key");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { events: [tmEvent()] } }),
    });

    await fetchTicketmasterEvents({ query: "Bad Bunny", city: "Monterrey" });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(
      "https://app.ticketmaster.com/discovery/v2/events.json"
    );
    expect(url.searchParams.get("apikey")).toBe("tm-key");
    expect(url.searchParams.get("keyword")).toBe("Bad Bunny");
    expect(url.searchParams.get("countryCode")).toBe("MX");
    expect(url.searchParams.get("city")).toBe("Monterrey");
    expect(url.searchParams.get("size")).toBe("30");
  });

  it("honors TICKETMASTER_COUNTRY_CODE override", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "tm-key");
    vi.stubEnv("TICKETMASTER_COUNTRY_CODE", "US");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { events: [] } }),
    });

    await fetchTicketmasterEvents({ query: "techno" });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("countryCode")).toBe("US");
  });

  it("normalizes and returns events from the payload", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "tm-key");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { events: [tmEvent()] } }),
    });

    const result = await fetchTicketmasterEvents({ query: "Bad Bunny" });
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("ticketmaster");
  });

  it("drops past events via the freshness filter", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "tm-key");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: {
          events: [tmEvent({ dates: { start: { localDate: "2000-01-01" } } })],
        },
      }),
    });

    const result = await fetchTicketmasterEvents({ query: "old" });
    expect(result).toEqual([]);
  });

  it("returns [] on a 200 with no events (genuine empty, no throw)", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "tm-key");
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ page: {} }) });

    await expect(fetchTicketmasterEvents({ query: "x" })).resolves.toEqual([]);
  });

  it("throws ProvidersUnavailableError on a non-ok response", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "tm-key");
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });

    await expect(
      fetchTicketmasterEvents({ query: "x" })
    ).rejects.toBeInstanceOf(ProvidersUnavailableError);
  });

  it("throws ProvidersUnavailableError when fetch throws", async () => {
    vi.stubEnv("TICKETMASTER_API_KEY", "tm-key");
    fetchMock.mockRejectedValue(new Error("network"));

    await expect(
      fetchTicketmasterEvents({ query: "x" })
    ).rejects.toBeInstanceOf(ProvidersUnavailableError);
  });
});
