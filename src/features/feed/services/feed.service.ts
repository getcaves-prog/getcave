import type { FeedEvent } from "../types/feed.types";
import type {
  GeoSearchParams,
  PaginationParams,
} from "@/shared/types/common.types";

const FEED_LIMIT = 20;

export async function fetchNearbyEvents(
  geo: GeoSearchParams,
  pagination: PaginationParams = { limit: FEED_LIMIT, offset: 0 },
  categorySlug?: string
): Promise<{ events: FeedEvent[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    lat: geo.latitude.toString(),
    lng: geo.longitude.toString(),
    radius: geo.radiusMeters.toString(),
    limit: pagination.limit.toString(),
    offset: pagination.offset.toString(),
  });

  if (categorySlug) {
    params.set("category", categorySlug);
  }

  const response = await fetch(`/api/events?${params}`);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to fetch events");
  }

  const data = await response.json();

  return {
    events: data.events as FeedEvent[],
    hasMore: data.events.length === pagination.limit,
  };
}
