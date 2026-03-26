"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InfiniteCanvas } from "@/features/canvas/components/infinite-canvas";
import { CanvasHeader } from "@/shared/components/layout/canvas-header";
import { useGeolocation } from "@/shared/hooks/use-geolocation";
import { useLocationStore } from "@/shared/stores/location.store";
import { useCanvasReadyStore } from "@/features/canvas/stores/canvas-ready.store";

/** Max time to wait for canvas readiness before forcing the intro exit */
const MAX_WAIT_MS = 4000;

export default function HomePage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [targetY, setTargetY] = useState(0);

  const canvasReady = useCanvasReadyStore((s) => s.ready);
  const timeoutFiredRef = useRef(false);
  const animationDoneRef = useRef(false);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { latitude, longitude, loading: geoLoading, error: geoError } = useGeolocation();

  // Sync geolocation into Zustand store
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      useLocationStore.getState().setLocation(latitude, longitude);
    } else if (!geoLoading && geoError) {
      useLocationStore.getState().setError(geoError);
    } else if (!geoLoading) {
      // Geolocation finished but no coordinates (denied/unavailable)
      useLocationStore.getState().setError("Location unavailable");
    }
  }, [latitude, longitude, geoLoading, geoError]);

  useEffect(() => {
    setTargetY(-(window.innerHeight / 2 - 28));
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
      {/* Canvas + Header — always mounted, fades in smoothly */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: introComplete ? 1 : 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="h-full w-full"
        style={{ willChange: "opacity" }}
      >
        <CanvasHeader hidelogo={!introComplete} />
        <InfiniteCanvas />
      </motion.div>

      {/* Intro overlay */}
      <AnimatePresence>
        {!introComplete && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            initial={{ backgroundColor: "rgba(5,5,5,1)" }}
            animate={{ backgroundColor: "rgba(5,5,5,1)" }}
            exit={{ backgroundColor: "rgba(5,5,5,0)" }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              className="text-cave-white font-[family-name:var(--font-pinyon-script)] select-none"
              style={{ fontSize: "6rem", willChange: "transform, opacity" }}
              initial={{ scale: 1, y: 0, opacity: 1 }}
              animate={{
                scale: 0.55,
                y: targetY,
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 22,
                mass: 0.8,
                delay: 0.4,
              }}
              onAnimationComplete={handleAnimationComplete}
            >
              Caves
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
