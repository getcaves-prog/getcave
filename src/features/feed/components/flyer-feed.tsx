"use client";

import { useGeolocation } from "../hooks/use-geolocation";
import { useFeed } from "../hooks/use-feed";
import { FlyerBoard } from "./flyer-board";
import { FeedEmpty } from "./feed-empty";

export function FlyerFeed() {
  const {
    coordinates,
    loading: geoLoading,
    status: geoStatus,
  } = useGeolocation();

  const {
    events,
    loading: feedLoading,
    error: feedError,
    loadMore,
  } = useFeed(coordinates);

  // While waiting for location, show empty grid
  if (geoStatus === "prompt" || (!coordinates && !geoLoading && geoStatus === "denied")) {
    return <FeedEmpty />;
  }

  // Loading state
  if ((geoLoading || feedLoading) && events.length === 0) {
    return <FeedEmpty />;
  }

  // Error state
  if (feedError && events.length === 0) {
    return <FeedEmpty />;
  }

  // Empty state
  if (!feedLoading && events.length === 0) {
    return <FeedEmpty />;
  }

  return (
    <FlyerBoard
      events={events}
      loading={feedLoading}
      onLoadMore={loadMore}
    />
  );
}
