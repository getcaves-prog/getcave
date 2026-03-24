"use client";

import { useGeolocation } from "../hooks/use-geolocation";
import { useFeed } from "../hooks/use-feed";
import { SwipeContainer } from "./swipe-container";
import { GeolocationPrompt } from "./geolocation-prompt";
import { FeedEmpty } from "./feed-empty";
import { FeedError } from "./feed-error";
import { LoadingSpinner } from "@/shared/components/ui/loading-spinner";

export function FlyerFeed() {
  const {
    coordinates,
    loading: geoLoading,
    status: geoStatus,
    retry: retryGeo,
    useDefault: useDefaultLocation,
  } = useGeolocation();

  const {
    events,
    loading: feedLoading,
    error: feedError,
    loadMore,
    currentIndex,
    setCurrentIndex,
    retry: retryFeed,
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
    <SwipeContainer
      events={events}
      currentIndex={currentIndex}
      onIndexChange={setCurrentIndex}
      onReachEnd={loadMore}
    />
  );
}
