// Server-only orchestrator: runs every enabled event provider, merges and
// dedupes their results. Each provider normalizes + filters freshness on its
// own; the location filter runs per-request at the route level.
import { apifyProvider } from "@/features/discover/providers/apify.provider";
import { ticketmasterProvider } from "@/features/discover/providers/ticketmaster.provider";
import {
  ProvidersUnavailableError,
  type EventProvider,
  type ProviderParams,
} from "@/features/discover/providers/provider.types";
import type { ScrapedFlyer } from "@/features/discover/types/discover.types";

/** Registry of available providers. Add new sources here (Meetup, etc.). */
const PROVIDERS: EventProvider[] = [apifyProvider, ticketmasterProvider];

const MAX_RESULTS = 40;

/** True when at least one provider is configured (the discovery feature is on). */
export function hasEnabledProvider(): boolean {
  return PROVIDERS.some((provider) => provider.isEnabled());
}

/**
 * Fetch + merge events from all enabled providers.
 *
 * - Providers run concurrently; one failing does not sink the others.
 * - Returns the deduped union (capped) of every provider that succeeded.
 * - Throws ProvidersUnavailableError ONLY when nothing was fetched AND at least
 *   one provider failed — so the route avoids caching an empty result that a
 *   retry could fill. (All-providers-succeed-with-zero is a genuine empty.)
 * - With no providers enabled (no keys/tokens configured) returns [] (feature off).
 */
export async function aggregateEvents(
  params: ProviderParams
): Promise<ScrapedFlyer[]> {
  const enabled = PROVIDERS.filter((provider) => provider.isEnabled());
  if (enabled.length === 0) return [];

  const settled = await Promise.allSettled(
    enabled.map((provider) => provider.fetchEvents(params))
  );

  const flyers: ScrapedFlyer[] = [];
  let anyFailed = false;
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      flyers.push(...outcome.value);
    } else {
      anyFailed = true;
    }
  }

  if (flyers.length === 0 && anyFailed) {
    throw new ProvidersUnavailableError(
      "All enabled event providers were unavailable"
    );
  }

  return dedupeById(flyers).slice(0, MAX_RESULTS);
}

/** Drop flyers sharing a synthetic id (cross-provider dedupe). */
function dedupeById(flyers: ScrapedFlyer[]): ScrapedFlyer[] {
  const seen = new Set<string>();
  const result: ScrapedFlyer[] = [];
  for (const flyer of flyers) {
    if (seen.has(flyer.id)) continue;
    seen.add(flyer.id);
    result.push(flyer);
  }
  return result;
}
