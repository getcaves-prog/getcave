"use client";

import { InfiniteCanvas } from "./infinite-canvas";
import { CanvasHeader } from "@/shared/components/layout/canvas-header";
import { FlyerDetailModal } from "./flyer-detail-modal";
import { useRouter } from "next/navigation";
import { useGeolocation } from "@/shared/hooks/use-geolocation";
import { useLocationStore } from "@/shared/stores/location.store";
import { useEffect } from "react";
import type { LayoutFlyer } from "../types/canvas.types";

interface FlyerOverlayPageProps {
  flyer: Record<string, unknown>;
}

export function FlyerOverlayPage({ flyer }: FlyerOverlayPageProps) {
  const router = useRouter();
  const { latitude, longitude, loading: geoLoading, error: geoError } = useGeolocation();

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      useLocationStore.getState().setLocation(latitude, longitude);
    } else if (!geoLoading && geoError) {
      useLocationStore.getState().setError(geoError);
    } else if (!geoLoading) {
      useLocationStore.getState().setError("Location unavailable");
    }
  }, [latitude, longitude, geoLoading, geoError]);

  // Convert DB flyer to LayoutFlyer shape for the modal
  const layoutFlyer: LayoutFlyer = {
    ...(flyer as unknown as LayoutFlyer),
    grid_id: "shared",
    layout_x: 0,
    layout_y: 0,
    layout_width: 380,
    layout_height: 543,
    layout_rotation: 0,
  };

  return (
    <main className="h-dvh w-screen overflow-hidden bg-cave-black" style={{ position: "fixed", inset: 0 }}>
      <CanvasHeader />
      <InfiniteCanvas />
      <FlyerDetailModal flyer={layoutFlyer} onClose={() => router.push("/")} />
    </main>
  );
}
