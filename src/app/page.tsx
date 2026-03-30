"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { InfiniteCanvas } from "@/features/canvas/components/infinite-canvas";
import { CanvasHeader } from "@/shared/components/layout/canvas-header";
import { CategoryFilterBar } from "@/features/canvas/components/category-filter-bar";
import { OnboardingOverlay } from "@/features/onboarding/components/onboarding-overlay";
import { useGeolocation } from "@/shared/hooks/use-geolocation";
import { useLocationStore } from "@/shared/stores/location.store";
import { useCanvasReadyStore } from "@/features/canvas/stores/canvas-ready.store";
import { reverseGeocode } from "@/shared/lib/geocoding/geocoding.service";
import { registerPushNotifications } from "@/shared/lib/notifications/push.service";

/** Max time to wait for canvas readiness before forcing the intro exit */
const MAX_WAIT_MS = 800;

export default function HomePage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [targetY, setTargetY] = useState(0);
  const [onboardingDone, setOnboardingDone] = useState(false);

  const canvasReady = useCanvasReadyStore((s) => s.ready);
  const timeoutFiredRef = useRef(false);
  const animationDoneRef = useRef(false);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { latitude, longitude, loading: geoLoading, error: geoError } = useGeolocation();

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

  return (
    <main className="h-dvh w-screen overflow-hidden bg-cave-black" style={{ position: "fixed", inset: 0 }}>
      {/* Canvas + Header — always mounted, renders behind intro */}
      <div className="h-full w-full">
        <CanvasHeader hidelogo={!introComplete} />
        <CategoryFilterBar />
        <InfiniteCanvas />
      </div>

      {/* Onboarding overlay — shown after intro animation */}
      {introComplete && !onboardingDone && (
        <OnboardingOverlay onComplete={() => setOnboardingDone(true)} />
      )}

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
