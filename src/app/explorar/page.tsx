"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { InfiniteCanvas } from "@/features/canvas/components/infinite-canvas";
import { CanvasHeader } from "@/shared/components/layout/canvas-header";
import { InlineAuthModal } from "@/features/auth/components/inline-auth-modal";
import { ScrapingIndicator } from "@/features/discover/components/scraping-indicator";
import { useDiscover } from "@/features/discover/hooks/use-discover";
import { useGeolocation } from "@/shared/hooks/use-geolocation";
import { useLocationStore } from "@/shared/stores/location.store";
import { useCanvasReadyStore } from "@/features/canvas/stores/canvas-ready.store";
import { useDisplayModeStore } from "@/features/canvas/stores/display-mode.store";
import { usePendingActionStore } from "@/features/auth/stores/pending-action.store";
import { reverseGeocode } from "@/shared/lib/geocoding/geocoding.service";
import { registerPushNotifications } from "@/shared/lib/notifications/push.service";
import { ForYouGate } from "@/features/onboarding/components/for-you-gate";

/** Max time to wait for canvas readiness before forcing the intro exit */
const MAX_WAIT_MS = 800;

/** Short city guess from a reverse-geocoded display name (first segment). */
function guessCity(locationName: string | null): string {
  if (!locationName) return "";
  return locationName.split(",")[0]?.trim() ?? "";
}

function ExplorarInner() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const isDiscoverMode = query.length > 0;

  const [introComplete, setIntroComplete] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [targetY, setTargetY] = useState(0);

  const canvasReady = useCanvasReadyStore((s) => s.ready);
  const displayMode = useDisplayModeStore((s) => s.mode);
  const authModalOpen = usePendingActionStore((s) => s.authModalOpen);
  const timeoutFiredRef = useRef(false);
  const animationDoneRef = useRef(false);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { latitude, longitude, loading: geoLoading, error: geoError } = useGeolocation();
  const locationName = useLocationStore((s) => s.locationName);

  // Discover (?q=) two-pass DB + scraped flow — only used in discover mode.
  const { results, loading, scraping, search } = useDiscover();

  // Register push notifications on mount (Capacitor only, fire and forget)
  useEffect(() => {
    registerPushNotifications();
  }, []);

  // Sync geolocation into Zustand store
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      useLocationStore.getState().setLocation(latitude, longitude);

      // Non-blocking reverse geocoding to get place name
      reverseGeocode({ lat: latitude, lng: longitude }).then((result) => {
        if (result) {
          useLocationStore.getState().setLocationName(result.displayName);
        }
      });
    } else if (!geoLoading && geoError) {
      useLocationStore.getState().setError(geoError);
    } else if (!geoLoading) {
      // Geolocation finished but no coordinates (denied/unavailable)
      useLocationStore.getState().setError("Location unavailable");
    }
  }, [latitude, longitude, geoLoading, geoError]);

  // Run the discover flow when a `?q=` is present (or changes).
  useEffect(() => {
    if (isDiscoverMode) {
      search(query, guessCity(locationName));
    }
    // locationName intentionally omitted: we don't want to re-run mid-typing of
    // the reverse geocode; the query param is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isDiscoverMode, search]);

  useEffect(() => {
    // Target: center of screen → header center (24px from top)
    setTargetY(-(window.innerHeight / 2 - 24));
  }, []);

  // Attempt to complete intro when conditions are met
  const tryCompleteIntro = useCallback(() => {
    if (introComplete) return;
    if (!animationDoneRef.current) return;

    setIntroComplete(true);
  }, [introComplete]);

  // When canvas becomes ready after animation, complete intro
  useEffect(() => {
    if (canvasReady && animationDone) {
      tryCompleteIntro();
    }
  }, [canvasReady, animationDone, tryCompleteIntro]);

  // When logo animation finishes, either complete immediately or wait
  const handleAnimationComplete = useCallback(() => {
    animationDoneRef.current = true;
    setAnimationDone(true);

    if (canvasReady || timeoutFiredRef.current) {
      // Canvas is already ready or timeout already fired — complete now
      setIntroComplete(true);
      return;
    }

    // Start a max-wait timeout to prevent infinite loading
    maxWaitTimerRef.current = setTimeout(() => {
      timeoutFiredRef.current = true;
      setIntroComplete(true);
    }, MAX_WAIT_MS);
  }, [canvasReady]);

  // Clean up max-wait timer on unmount or when intro completes
  useEffect(() => {
    if (introComplete && maxWaitTimerRef.current) {
      clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
    return () => {
      if (maxWaitTimerRef.current) {
        clearTimeout(maxWaitTimerRef.current);
      }
    };
  }, [introComplete]);

  const hasResults = results.length > 0;

  return (
    <main
      className={`w-screen bg-cave-black ${
        displayMode === "grid"
          ? "min-h-dvh overflow-y-auto"
          : "overflow-hidden"
      }`}
      style={displayMode === "grid" ? undefined : { position: "fixed", inset: 0 }}
    >
      {/* Canvas + Header — always mounted, renders behind intro */}
      <div className="h-full w-full">
        <CanvasHeader hidelogo={!introComplete} />
        {isDiscoverMode ? (
          <InfiniteCanvas
            flyers={results}
            loading={loading || (scraping && !hasResults)}
            emptyLabel="Sin resultados"
          />
        ) : (
          <InfiniteCanvas />
        )}
      </div>

      {/* Non-blocking scraped-pass indicator (discover mode only). */}
      <AnimatePresence>
        {isDiscoverMode && scraping && <ScrapingIndicator />}
      </AnimatePresence>

      {/* Inline auth modal — save gate for unauthenticated users */}
      <AnimatePresence>
        {authModalOpen && <InlineAuthModal />}
      </AnimatePresence>

      {/* For You onboarding gate — shows once per authenticated user (DB-backed) */}
      <ForYouGate />

      {/* Intro overlay — fades out to reveal canvas underneath */}
      <AnimatePresence>
        {!introComplete && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-cave-black"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <motion.div
              className="select-none"
              style={{ willChange: "transform" }}
              initial={{ scale: 1, y: 0 }}
              animate={{
                scale: 0.4,
                y: targetY,
              }}
              transition={{
                type: "tween",
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={handleAnimationComplete}
            >
              <Image
                src="/Logo.png"
                alt="Caves"
                width={320}
                height={115}
                priority
                className="h-auto w-[320px]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function ExplorarPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<main className="h-dvh w-screen bg-cave-black" />}>
      <ExplorarInner />
    </Suspense>
  );
}
