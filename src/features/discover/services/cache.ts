import type { ScrapedFlyer } from "@/features/discover/types/discover.types";

/**
 * Default time-to-live for a cached scrape: 24 hours.
 * Longer TTL = far fewer Apify runs (each costs money / burns the monthly
 * quota). Events don't change often, so a stale-by-a-day list is acceptable.
 */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** Max number of entries before we evict the oldest (LRU-ish). */
const MAX_ENTRIES = 50;

interface CacheEntry {
  value: ScrapedFlyer[];
  expiresAt: number;
}

// Module-level Map. Insertion order is preserved, which we use for eviction.
const store = new Map<string, CacheEntry>();

/** Build the canonical cache key from a query and optional city. */
export function makeCacheKey(query: string, city?: string): string {
  const q = query.trim().toLowerCase();
  const c = (city ?? "").trim().toLowerCase();
  return `${q}|${c}`;
}

/** Get a cached value, or undefined on miss/expiry. Expired entries are purged. */
export function getCached(key: string): ScrapedFlyer[] | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }

  return entry.value;
}

/** Store a value under a key with the default TTL, evicting the oldest if full. */
export function setCached(key: string, value: ScrapedFlyer[]): void {
  // Refresh recency: delete then re-insert so this key moves to the end.
  store.delete(key);

  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      store.delete(oldestKey);
    }
  }

  store.set(key, { value, expiresAt: Date.now() + DEFAULT_TTL_MS });
}

/** Test helper — wipe the cache. */
export function clearCache(): void {
  store.clear();
}
