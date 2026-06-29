import { scrapeEvents } from "@/features/discover/services/apify.service";
import type {
  EventProvider,
  ProviderParams,
} from "@/features/discover/providers/provider.types";
import type { ScrapedFlyer } from "@/features/discover/types/discover.types";

/**
 * Apify provider: Facebook + Instagram scraping. Thin adapter over the existing
 * `scrapeEvents` (which already expands the query, normalizes, enriches noisy IG
 * captions via Gemini, and filters freshness). Enabled only when APIFY_TOKEN is
 * set; `scrapeEvents` throws `ApifyUnavailableError` on a hard outage, which the
 * aggregator treats as "provider down".
 */
export const apifyProvider: EventProvider = {
  name: "apify",
  isEnabled: () => Boolean(process.env.APIFY_TOKEN),
  fetchEvents: ({ query, city }: ProviderParams): Promise<ScrapedFlyer[]> =>
    scrapeEvents({ query, city }),
};
