import type { NearbyFlyer } from "@/features/canvas/types/canvas.types";

/** Source platform a scraped event came from. */
export type ScrapedSource = "facebook" | "instagram";

/**
 * A scraped external event normalized to the canvas `NearbyFlyer` shape so the
 * existing canvas can render it like a normal flyer.
 *
 * - `id` is synthetic: `scraped:<source>:<hash>`
 * - `status` is always `"external"` (never a real flyer status)
 * - `distance_m` is `0` (we have no geo for scraped events)
 * - `location` is `null`
 * - all unused real-flyer columns are zeroed/nulled so the type is satisfied
 */
export interface ScrapedFlyer extends NearbyFlyer {
  source: ScrapedSource;
  external_url: string | null;
}

/**
 * True when a flyer is an external scraped event (Facebook / Instagram) rather
 * than a real DB flyer. Detected via `status: "external"` + a `source` field.
 */
export function isScrapedFlyer(
  flyer: NearbyFlyer & { source?: unknown; external_url?: unknown }
): flyer is ScrapedFlyer {
  return (
    flyer.status === "external" &&
    (flyer.source === "facebook" || flyer.source === "instagram")
  );
}

/** Fields a caller provides to build a ScrapedFlyer. The rest are filled in. */
export interface ScrapedFlyerInput {
  id: string;
  source: ScrapedSource;
  title: string;
  image_url: string;
  external_url?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  address?: string | null;
}

/**
 * Factory that produces a fully-formed ScrapedFlyer from the few meaningful
 * fields, filling every unused flyer column with a safe default so the result
 * satisfies the `NearbyFlyer` (and therefore `Flyer`) type.
 */
export function createScrapedFlyer(input: ScrapedFlyerInput): ScrapedFlyer {
  return {
    // Real flyer columns — defaults
    id: input.id,
    image_url: input.image_url,
    title: input.title,
    address: input.address ?? null,
    location: null,
    event_date: input.event_date ?? null,
    event_time: input.event_time ?? null,
    expires_at: null,
    duration_days: null,
    status: "external",
    user_id: null,
    community_id: null,
    is_promoted: false,
    promoted_until: null,
    description: null,
    social_copy: null,
    canvas_x: 0,
    canvas_y: 0,
    rotation: 0,
    width: 0,
    height: 0,
    created_at: new Date(0).toISOString(),
    // NearbyFlyer extras
    zone_name: null,
    distance_m: 0,
    // ScrapedFlyer extras
    source: input.source,
    external_url: input.external_url ?? null,
  };
}
