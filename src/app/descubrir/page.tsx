"use client";

import { useEffect } from "react";
import { DiscoverScreen } from "@/features/discover/components/discover-screen";
import { useGeolocation } from "@/shared/hooks/use-geolocation";
import { useLocationStore } from "@/shared/stores/location.store";
import { reverseGeocode } from "@/shared/lib/geocoding/geocoding.service";

export default function DescubrirPage() {
  const { latitude, longitude, loading: geoLoading, error: geoError } =
    useGeolocation();

  // Sync geolocation into the store so DiscoverScreen can prefill the city.
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      useLocationStore.getState().setLocation(latitude, longitude);

      reverseGeocode({ lat: latitude, lng: longitude }).then((result) => {
        if (result) {
          useLocationStore.getState().setLocationName(result.displayName);
        }
      });
    } else if (!geoLoading && geoError) {
      useLocationStore.getState().setError(geoError);
    } else if (!geoLoading) {
      useLocationStore.getState().setError("Location unavailable");
    }
  }, [latitude, longitude, geoLoading, geoError]);

  return <DiscoverScreen />;
}
