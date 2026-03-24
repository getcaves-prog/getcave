"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ROWS = 4;
const COLS = 3;
const PAGES = 3;
const CARDS_PER_PAGE = ROWS * COLS;

export function FeedEmpty() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const page = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentPage(page);
  }, []);

  return (
    <>
      <div className="relative h-dvh">
        {/* Horizontal scroll container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain scrollbar-hide"
        >
          {Array.from({ length: PAGES }, (_, page) => (
            <div
              key={page}
              className="h-full w-full flex-none snap-center px-2 pb-10 pt-2"
            >
              <div className="grid h-full grid-cols-3 grid-rows-4 gap-1">
                {Array.from({ length: CARDS_PER_PAGE }, (_, i) => {
                  const globalIndex = page * CARDS_PER_PAGE + i;
                  const delay = (Math.floor(i / COLS) * 0.05) + ((i % COLS) * 0.03);

                  return (
                    <motion.button
                      key={i}
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay,
                        duration: 0.3,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      whileTap={{ scale: 0.93, brightness: 1.2 }}
                      onClick={() => setExpanded(globalIndex)}
                      className="rounded bg-[#111] transition-shadow active:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Page dots */}
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
          {Array.from({ length: PAGES }, (_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === currentPage ? 20 : 6,
                opacity: i === currentPage ? 1 : 0.3,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="h-[6px] rounded-full bg-white"
            />
          ))}
        </div>
      </div>

      {/* Fullscreen poster view */}
      <AnimatePresence>
        {expanded !== null && (
          <motion.button
            type="button"
            onClick={() => setExpanded(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="mx-6 aspect-[3/4] w-full max-w-sm rounded bg-[#111]"
            />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
