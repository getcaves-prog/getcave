"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { User } from "@/features/auth/types/auth.types";

interface SlideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSignOut: () => Promise<void>;
}

const MENU_VARIANTS = {
  closed: { x: "-100%" },
  open: { x: 0 },
} as const;

const BACKDROP_VARIANTS = {
  closed: { opacity: 0 },
  open: { opacity: 1 },
} as const;

const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;

export function SlideMenu({ isOpen, onClose, user, onSignOut }: SlideMenuProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    await onSignOut();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            variants={BACKDROP_VARIANTS}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.nav
            className="fixed top-0 left-0 bottom-0 z-[70] w-72 bg-cave-dark/95 backdrop-blur-md border-r border-cave-ash"
            variants={MENU_VARIANTS}
            initial="closed"
            animate="open"
            exit="closed"
            transition={SPRING_TRANSITION}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Close button */}
            <div className="flex items-center justify-end h-14 px-4">
              <button
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-neon-green transition-colors"
                aria-label="Close menu"
              >
                <svg
                  width="24"
                  height="24"
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
            </div>

            {/* Menu items */}
            <ul className="px-4 space-y-2">
              {user ? (
                <li>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-3 rounded-lg text-cave-light font-[family-name:var(--font-space-mono)] text-sm tracking-wide hover:bg-cave-ash hover:text-neon-green transition-colors"
                  >
                    Log Out
                  </button>
                </li>
              ) : (
                <li>
                  <Link
                    href="/auth/login"
                    onClick={onClose}
                    className="block px-4 py-3 rounded-lg text-cave-light font-[family-name:var(--font-space-mono)] text-sm tracking-wide hover:bg-cave-ash hover:text-neon-green transition-colors"
                  >
                    Log In
                  </Link>
                </li>
              )}
            </ul>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
