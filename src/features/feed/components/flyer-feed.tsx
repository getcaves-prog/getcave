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

  // Show prompt when geo check finished and we need user permission
  if (geoStatus === "prompt" || (!coordinates && !geoLoading && geoStatus === "denied")) {
    return (
      <GeolocationPrompt
        onEnableLocation={retryGeo}
        onUseDefault={useDefaultLocation}
        loading={geoLoading}
      />
    );
  }

  // Loading state
  if ((geoLoading || feedLoading) && events.length === 0) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-[#0A0A0A]">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-[#A0A0A0]">
          {geoLoading ? "Finding your location..." : "Loading events..."}
        </p>
      </div>
    );
  }

  // Error state
  if (feedError && events.length === 0) {
    return <FeedError message={feedError} onRetry={retryFeed} />;
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
