import { describe, it, expect } from "vitest";
import { normalizeApifyEvent } from "./normalize";

describe("normalizeApifyEvent", () => {
  it("maps a typical Facebook event shape", () => {
    const raw = {
      name: "Techno Night",
      imageUrl: "https://scontent.fbcdn.net/abc.jpg",
      startDate: "2026-07-01T22:00:00.000Z",
      location: "Club Vibra, Monterrey",
      url: "https://facebook.com/events/123",
    };

    const result = normalizeApifyEvent(raw, "facebook");

    expect(result).not.toBeNull();
    expect(result?.source).toBe("facebook");
    expect(result?.title).toBe("Techno Night");
    expect(result?.image_url).toBe("https://scontent.fbcdn.net/abc.jpg");
    expect(result?.event_date).toBe("2026-07-01");
    expect(result?.address).toBe("Club Vibra, Monterrey");
    expect(result?.external_url).toBe("https://facebook.com/events/123");
    expect(result?.status).toBe("external");
    expect(result?.distance_m).toBe(0);
    expect(result?.location).toBeNull();
    expect(result?.id).toMatch(/^scraped:facebook:/);
  });

  it("maps an alternative Instagram shape (title/image/eventUrl)", () => {
    const raw = {
      title: "Cumbia Fest",
      image: "https://instagram.fcdn.cdninstagram.com/x.jpg",
      date: "2026-08-15",
      time: "21:30",
      venue: "Parque Fundidora",
      eventUrl: "https://instagram.com/p/xyz",
    };

    const result = normalizeApifyEvent(raw, "instagram");

    expect(result?.source).toBe("instagram");
    expect(result?.title).toBe("Cumbia Fest");
    expect(result?.image_url).toBe(
      "https://instagram.fcdn.cdninstagram.com/x.jpg"
    );
    expect(result?.event_date).toBe("2026-08-15");
    expect(result?.event_time).toBe("21:30");
    expect(result?.address).toBe("Parque Fundidora");
    expect(result?.external_url).toBe("https://instagram.com/p/xyz");
  });

  it("falls back across field aliases (thumbnailUrl, dateTime, address, link)", () => {
    const raw = {
      name: "Rave",
      thumbnailUrl: "https://cdn.fbsbx.com/r.jpg",
      dateTime: "2026-09-09T20:00:00Z",
      address: "Centro",
      link: "https://fb.com/e/1",
    };

    const result = normalizeApifyEvent(raw, "facebook");

    expect(result?.image_url).toBe("https://cdn.fbsbx.com/r.jpg");
    expect(result?.event_date).toBe("2026-09-09");
    expect(result?.address).toBe("Centro");
    expect(result?.external_url).toBe("https://fb.com/e/1");
  });

  it("returns null when there is no usable image", () => {
    const raw = { name: "No Image Event", url: "https://fb.com/e/2" };
    expect(normalizeApifyEvent(raw, "facebook")).toBeNull();
  });

  it("returns null when there is no title", () => {
    const raw = { imageUrl: "https://scontent.fbcdn.net/a.jpg" };
    expect(normalizeApifyEvent(raw, "facebook")).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(normalizeApifyEvent(null, "facebook")).toBeNull();
    expect(normalizeApifyEvent("nope", "facebook")).toBeNull();
    expect(normalizeApifyEvent(42, "instagram")).toBeNull();
  });

  it("handles null fields gracefully (null date/time/location)", () => {
    const raw = {
      name: "Minimal",
      imageUrl: "https://scontent.fbcdn.net/m.jpg",
      startDate: null,
      time: null,
      location: null,
      url: null,
    };

    const result = normalizeApifyEvent(raw, "facebook");

    expect(result).not.toBeNull();
    expect(result?.event_date).toBeNull();
    expect(result?.event_time).toBeNull();
    expect(result?.address).toBeNull();
    expect(result?.external_url).toBeNull();
  });

  it("generates a stable id for the same event", () => {
    const raw = {
      name: "Stable",
      imageUrl: "https://scontent.fbcdn.net/s.jpg",
      url: "https://facebook.com/events/999",
    };

    const a = normalizeApifyEvent(raw, "facebook");
    const b = normalizeApifyEvent(raw, "facebook");

    expect(a?.id).toBe(b?.id);
  });

  it("ignores an invalid date string and keeps event_date null", () => {
    const raw = {
      name: "Bad Date",
      imageUrl: "https://scontent.fbcdn.net/b.jpg",
      startDate: "not-a-date",
    };

    const result = normalizeApifyEvent(raw, "facebook");
    expect(result).not.toBeNull();
    expect(result?.event_date).toBeNull();
  });
});
