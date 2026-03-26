"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { LayoutFlyer } from "../types/canvas.types";

interface FlyerDetailModalProps {
  flyer: LayoutFlyer;
  onClose: () => void;
}

export function FlyerDetailModal({ flyer, onClose }: FlyerDetailModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Dark cave backdrop — starts fully black */}
      <motion.div
        className="absolute inset-0 bg-black"
        onClick={onClose}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.92 }}
        exit={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Vignette overlay — cave tunnel effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        exit={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          background: "radial-gradient(circle at center, transparent 30%, black 100%)",
        }}
      />

      {/* Content — emerges from deep in the cave */}
      <motion.div
        className="relative z-10 flex flex-col items-center max-w-[360px] w-full"
        initial={{ scale: 0.15, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.15, opacity: 0, y: 40 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 22,
          mass: 1.2,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-cave-black/90 border border-cave-ash/40 text-cave-fog hover:text-cave-white hover:border-cave-white/50 transition-colors"
          aria-label="Close flyer detail"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Flyer image */}
        <motion.div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "7 / 10" }}
          initial={{ filter: "brightness(0)" }}
          animate={{ filter: "brightness(1)" }}
          exit={{ filter: "brightness(0)" }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Image
            src={flyer.image_url}
            alt={flyer.title ?? "Event flyer"}
            fill
            sizes="360px"
            className="object-cover"
            unoptimized
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
