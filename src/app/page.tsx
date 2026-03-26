"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InfiniteCanvas } from "@/features/canvas/components/infinite-canvas";
import { CanvasHeader } from "@/shared/components/layout/canvas-header";

export default function HomePage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [targetY, setTargetY] = useState(0);

  useEffect(() => {
    // Calculate how far the logo needs to travel: from center to header (28px from top)
    setTargetY(-(window.innerHeight / 2 - 28));
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-cave-black">
      {/* Canvas + Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: introComplete ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        className="h-full w-full"
      >
        <CanvasHeader hidelogo={!introComplete} />
        <InfiniteCanvas />
      </motion.div>

      {/* Intro — logo animates from center to header */}
      <AnimatePresence>
        {!introComplete && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-cave-black"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.h1
              className="text-cave-white font-[family-name:var(--font-pinyon-script)] select-none"
              initial={{ scale: 1, y: 0 }}
              animate={{
                scale: 0.55,
                y: targetY,
              }}
              transition={{
                duration: 0.85,
                delay: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={() => setIntroComplete(true)}
              style={{ fontSize: "6rem" }}
            >
              Caves
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
