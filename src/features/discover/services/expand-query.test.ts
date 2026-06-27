import { describe, it, expect } from "vitest";
import { expandQuery } from "./expand-query";

describe("expandQuery", () => {
  it("returns only the original query when nothing matches a theme", () => {
    expect(expandQuery("qwerty")).toEqual(["qwerty"]);
  });

  it("expands a dance query (salsa) with related dance terms", () => {
    const result = expandQuery("salsa");
    expect(result).toContain("salsa");
    expect(result).toContain("baile");
    expect(result).toContain("bachata");
    expect(result).toContain("clases de baile");
  });

  it("keeps the original query first", () => {
    expect(expandQuery("salsa")[0]).toBe("salsa");
  });

  it("expands an electronic query (techno) with electronic terms", () => {
    const result = expandQuery("techno");
    expect(result).toContain("techno");
    expect(result.some((t) => /electr[oó]nica/i.test(t))).toBe(true);
    expect(result).toContain("house");
  });

  it("expands a live-music query (rock)", () => {
    const result = expandQuery("rock");
    expect(result).toContain("rock");
    expect(result).toContain("concierto");
  });

  it("expands an art query (taller)", () => {
    const result = expandQuery("taller");
    expect(result).toContain("arte");
  });

  it("expands a food query (gastro)", () => {
    const result = expandQuery("gastro");
    expect(result.some((t) => /gastronom[ií]a/i.test(t))).toBe(true);
  });

  it("expands a comedy query (standup)", () => {
    const result = expandQuery("standup");
    expect(result).toContain("comedia");
  });

  it("caps the result at 4 terms", () => {
    expect(expandQuery("salsa").length).toBeLessThanOrEqual(4);
  });

  it("dedupes case-insensitively (no duplicate of the original)", () => {
    // "baile" is both a keyword and a related term — must appear once.
    const result = expandQuery("Baile");
    const lower = result.map((t) => t.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
    expect(result[0]).toBe("Baile");
  });

  it("matches accent-insensitively (electrónica matches the electronic theme)", () => {
    const result = expandQuery("electrónica");
    expect(result.length).toBeGreaterThan(1);
    expect(result).toContain("techno");
  });

  it("trims and ignores empty/whitespace queries gracefully", () => {
    expect(expandQuery("   ")).toEqual([""]);
  });

  it("expands an anime/geek query with related terms", () => {
    const result = expandQuery("anime");
    expect(result).toContain("anime");
    expect(result.some((t) => /convenci[oó]n/i.test(t))).toBe(true);
    expect(result).toContain("cosplay");
  });

  it("matches the anime theme in a multi-word query (reunion anime)", () => {
    const result = expandQuery("reunion anime");
    expect(result[0]).toBe("reunion anime");
    expect(result.length).toBeGreaterThan(1);
    expect(result).toContain("cosplay");
  });

  it("expands a gaming query (esports)", () => {
    const result = expandQuery("esports");
    expect(result).toContain("gaming");
    expect(result).toContain("torneo");
  });

  it("expands a cinema query (película)", () => {
    const result = expandQuery("película");
    expect(result).toContain("cine");
  });

  it("expands a networking query (meetup)", () => {
    const result = expandQuery("meetup");
    expect(result).toContain("networking");
  });

  it("expands a sports query (running)", () => {
    const result = expandQuery("running");
    expect(result).toContain("deporte");
  });
});
