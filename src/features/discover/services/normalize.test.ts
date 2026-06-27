import { describe, it, expect, vi, afterEach } from "vitest";
import { normalizeApifyEvent } from "./normalize";

// Realistic apify/facebook-events-scraper event object.
function fbEvent(overrides: Record<string, unknown> = {}) {
  return {
    name: "Techno Night",
    url: "https://facebook.com/events/123",
    imageUrl: "https://scontent.fbcdn.net/abc.jpg",
    imageCaption: "Flyer",
    utcStartDate: "2026-07-01T22:00:00.000Z",
    startTime: "22:00",
    dateTimeSentence: "Wed, Jul 1 at 10 PM",
    address: "Club Vibra, Monterrey",
    isCanceled: false,
    isPast: false,
    description: "La mejor noche de techno.",
    usersGoing: 120,
    usersInterested: 540,
    location: {
      name: "Club Vibra",
      city: "Monterrey",
      latitude: 25.6,
      longitude: -100.3,
      countryCode: "MX",
      streetAddress: "Av. Constitución 100",
    },
    ...overrides,
  };
}

// Realistic apify/instagram-hashtag-scraper post object.
function igPost(overrides: Record<string, unknown> = {}) {
  return {
    caption: "Cumbia Fest 2026\nNos vemos en Fundidora #cumbia",
    displayUrl: "https://instagram.fcdn.cdninstagram.com/x.jpg",
    url: "https://instagram.com/p/xyz",
    timestamp: "2026-06-15T18:30:00.000Z",
    locationName: "Parque Fundidora",
    ownerUsername: "cumbiafest",
    type: "Image",
    shortCode: "xyz",
    images: [],
    ...overrides,
  };
}

describe("normalizeApifyEvent — facebook", () => {
  it("maps a real facebook-events-scraper event", () => {
    const result = normalizeApifyEvent(fbEvent(), "facebook");

    expect(result).not.toBeNull();
    expect(result?.source).toBe("facebook");
    expect(result?.title).toBe("Techno Night");
    expect(result?.image_url).toBe("https://scontent.fbcdn.net/abc.jpg");
    expect(result?.external_url).toBe("https://facebook.com/events/123");
    expect(result?.event_date).toBe("2026-07-01");
    expect(result?.event_time).toBe("22:00");
    expect(result?.address).toBe("Club Vibra, Monterrey");
    expect(result?.description).toBe("La mejor noche de techno.");
    expect(result?.status).toBe("external");
    expect(result?.distance_m).toBe(0);
    expect(result?.location).toBeNull();
    expect(result?.id).toMatch(/^scraped:facebook:/);
  });

  it("falls back to location.name then location.city for address", () => {
    const result = normalizeApifyEvent(
      fbEvent({ address: null }),
      "facebook"
    );
    expect(result?.address).toBe("Club Vibra");

    const noName = normalizeApifyEvent(
      fbEvent({
        address: null,
        location: { name: null, city: "Guadalajara" },
      }),
      "facebook"
    );
    expect(noName?.address).toBe("Guadalajara");
  });

  it("returns null for a canceled event", () => {
    expect(
      normalizeApifyEvent(fbEvent({ isCanceled: true }), "facebook")
    ).toBeNull();
  });

  it("returns null for a past event", () => {
    expect(normalizeApifyEvent(fbEvent({ isPast: true }), "facebook")).toBeNull();
  });

  it("returns null when there is no image", () => {
    expect(
      normalizeApifyEvent(fbEvent({ imageUrl: null }), "facebook")
    ).toBeNull();
  });

  it("returns null when there is no name", () => {
    expect(normalizeApifyEvent(fbEvent({ name: null }), "facebook")).toBeNull();
  });

  it("ignores an invalid utcStartDate and keeps event_date null", () => {
    const result = normalizeApifyEvent(
      fbEvent({ utcStartDate: "not-a-date" }),
      "facebook"
    );
    expect(result).not.toBeNull();
    expect(result?.event_date).toBeNull();
  });

  it("generates a stable id for the same event", () => {
    const a = normalizeApifyEvent(fbEvent(), "facebook");
    const b = normalizeApifyEvent(fbEvent(), "facebook");
    expect(a?.id).toBe(b?.id);
  });
});

describe("normalizeApifyEvent — instagram", () => {
  it("maps a real instagram-hashtag-scraper post", () => {
    const result = normalizeApifyEvent(igPost(), "instagram");

    expect(result).not.toBeNull();
    expect(result?.source).toBe("instagram");
    expect(result?.title).toBe("Cumbia Fest 2026");
    expect(result?.image_url).toBe(
      "https://instagram.fcdn.cdninstagram.com/x.jpg"
    );
    expect(result?.external_url).toBe("https://instagram.com/p/xyz");
    expect(result?.event_date).toBe("2026-06-15");
    expect(result?.event_time).toBeNull();
    expect(result?.address).toBe("Parque Fundidora");
    expect(result?.description).toContain("Cumbia Fest 2026");
    expect(result?.id).toMatch(/^scraped:instagram:/);
  });

  it("falls back to images[0] when displayUrl is missing", () => {
    const result = normalizeApifyEvent(
      igPost({
        displayUrl: null,
        images: ["https://cdninstagram.com/img0.jpg"],
      }),
      "instagram"
    );
    expect(result?.image_url).toBe("https://cdninstagram.com/img0.jpg");
  });

  it("falls back to @username when caption is empty", () => {
    const result = normalizeApifyEvent(
      igPost({ caption: null }),
      "instagram"
    );
    expect(result?.title).toBe("@cumbiafest");
  });

  it("falls back to a generic title when no caption and no username", () => {
    const result = normalizeApifyEvent(
      igPost({ caption: null, ownerUsername: null }),
      "instagram"
    );
    expect(result?.title).toBe("Post de Instagram");
  });

  it("truncates a long first caption line to ~80 chars", () => {
    const longLine = "x".repeat(200);
    const result = normalizeApifyEvent(
      igPost({ caption: longLine }),
      "instagram"
    );
    expect(result).not.toBeNull();
    expect((result?.title ?? "").length).toBeLessThanOrEqual(80);
  });

  it("returns null when there is no usable image", () => {
    expect(
      normalizeApifyEvent(
        igPost({ displayUrl: null, images: [] }),
        "instagram"
      )
    ).toBeNull();
  });

  it("keeps a Video post as long as it has a thumbnail", () => {
    const result = normalizeApifyEvent(
      igPost({ type: "Video" }),
      "instagram"
    );
    expect(result).not.toBeNull();
  });

  it("prefers the caption-parsed date + place over post date / locationName", () => {
    // The normalizer calls parseCaption() without an injected `now`, so it uses
    // the real clock. Freeze it to a date before June 11 for determinism.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));

    const caption =
      "⚡️🔊 Monterrey, ¿listos para algo diferente?\n\n" +
      "Este JUEVEX 11 DE JUNIO llega PHUNKADELICA a X Discoteca. 🖤🔥\n\n" +
      "📍 Barrio Antiguo\n" +
      "#XDiscoteca #TechnoMonterrey";
    const result = normalizeApifyEvent(
      igPost({
        caption,
        // timestamp (post date) and locationName must be overridden by the parse.
        timestamp: "2026-05-01T18:30:00.000Z",
        locationName: "Parque Fundidora",
      }),
      "instagram"
    );

    expect(result).not.toBeNull();
    // "11 DE JUNIO" → next occurrence on/after frozen now (2026-06-01).
    expect(result?.event_date).toBe("2026-06-11");
    expect(result?.address).toBe("Barrio Antiguo");

    vi.useRealTimers();
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("normalizeApifyEvent — defensive", () => {
  it("returns null for non-object input", () => {
    expect(normalizeApifyEvent(null, "facebook")).toBeNull();
    expect(normalizeApifyEvent("nope", "facebook")).toBeNull();
    expect(normalizeApifyEvent(42, "instagram")).toBeNull();
  });

  it("handles null FB fields gracefully", () => {
    const result = normalizeApifyEvent(
      fbEvent({
        utcStartDate: null,
        startTime: null,
        address: null,
        location: null,
        url: null,
        description: null,
      }),
      "facebook"
    );
    expect(result).not.toBeNull();
    expect(result?.event_date).toBeNull();
    expect(result?.event_time).toBeNull();
    expect(result?.address).toBeNull();
    expect(result?.external_url).toBeNull();
    expect(result?.description).toBeNull();
  });
});
