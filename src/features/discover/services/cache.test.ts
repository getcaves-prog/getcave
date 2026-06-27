import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCached, setCached, clearCache, makeCacheKey } from "./cache";
import type { ScrapedFlyer } from "@/features/discover/types/discover.types";

// Cache stores ScrapedFlyer[]; tests only care about identity, so cast minimal
// stubs through unknown to satisfy the type without building full objects.
const stub = (id: string): ScrapedFlyer[] =>
  [{ id }] as unknown as ScrapedFlyer[];

describe("discover cache", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined on a miss", () => {
    expect(getCached("nope")).toBeUndefined();
  });

  it("returns the stored value on a hit", () => {
    setCached("k1", stub("a"));
    expect(getCached("k1")).toEqual(stub("a"));
  });

  it("expires entries after the TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T00:00:00Z"));

    setCached("k1", stub("a"));
    expect(getCached("k1")).toEqual(stub("a"));

    // Advance past the 24h default TTL.
    vi.setSystemTime(new Date("2026-06-20T00:00:01Z"));
    expect(getCached("k1")).toBeUndefined();
  });

  it("does not expire entries before the TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T00:00:00Z"));

    setCached("k1", stub("a"));
    vi.setSystemTime(new Date("2026-06-19T23:59:59Z"));
    expect(getCached("k1")).toEqual(stub("a"));
  });

  it("evicts the oldest entry when over capacity (LRU-ish)", () => {
    // Default max is ~50. Fill beyond it and check the first key is gone.
    for (let i = 0; i < 60; i++) {
      setCached(`key-${i}`, stub(String(i)));
    }
    expect(getCached("key-0")).toBeUndefined();
    expect(getCached("key-59")).toEqual(stub("59"));
  });

  it("makeCacheKey lowercases and trims query and city", () => {
    expect(makeCacheKey("  Techno  ", "  Monterrey ")).toBe(
      "techno|monterrey"
    );
  });

  it("makeCacheKey handles missing city", () => {
    expect(makeCacheKey("Techno")).toBe("techno|");
  });
});
