import type { ScrapedFlyer } from "@/features/discover/types/discover.types";

/** Free-text search context handed to every provider. */
export interface ProviderParams {
  query: string;
  city?: string;
}

/**
 * A pluggable source of external events (Apify scrape, Ticketmaster API, …).
 *
 * Each provider is self-contained: it reads its OWN config from the environment
 * (`isEnabled`) and returns flyers already normalized to the canvas shape and
 * filtered for freshness. The location filter is NOT a provider concern — it
 * runs per-request at the route level so one cached raw set serves users near
 * different points.
 *
 * `fetchEvents` may THROW `ProvidersUnavailableError` (or any error) on a hard
 * outage; the aggregator treats a rejection as "this provider is down" and, if
 * every provider is down with nothing scraped, propagates so the empty result
 * is not cached.
 */
export interface EventProvider {
  readonly name: string;
  isEnabled(): boolean;
  fetchEvents(params: ProviderParams): Promise<ScrapedFlyer[]>;
}

/**
 * Thrown when every enabled provider was UNAVAILABLE (outage / over-quota /
 * network) and nothing was fetched — as opposed to a successful run that simply
 * found nothing. The route's catch turns this into an empty, NON-cached response
 * so a later request retries instead of serving blank for the full cache TTL.
 */
export class ProvidersUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProvidersUnavailableError";
  }
}
