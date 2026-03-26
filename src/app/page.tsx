"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InfiniteCanvas } from "@/features/canvas/components/infinite-canvas";
import { CanvasHeader } from "@/shared/components/layout/canvas-header";
import { useGeolocation } from "@/shared/hooks/use-geolocation";
import { useLocationStore } from "@/shared/stores/location.store";

export default function HomePage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [targetY, setTargetY] = useState(0);

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

  return (
    <main className="h-screen w-screen overflow-hidden bg-cave-black">
      {/* Canvas + Header — always mounted, fades in smoothly */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: introComplete ? 1 : 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="h-full w-full"
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
              style={{ fontSize: "6rem" }}
              initial={{ scale: 1, y: 0, opacity: 1 }}
              animate={{
                scale: 0.55,
                y: targetY,
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 80,
                damping: 18,
                mass: 1,
                delay: 0.4,
              }}
              onAnimationComplete={() => {
                setTimeout(() => setIntroComplete(true), 200);
              }}
            >
              Caves
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
