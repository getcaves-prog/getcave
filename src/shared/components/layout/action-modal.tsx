"use client";

import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useActionModalStore } from "@/shared/stores/action-modal.store";

const FlyerUploadModal = lazy(() =>
  import("@/features/flyers/components/flyer-upload-modal").then((m) => ({
    default: m.FlyerUploadModal,
  }))
);

const ProfileEditModal = lazy(() =>
  import("@/features/profile/components/profile-edit-modal").then((m) => ({
    default: m.ProfileEditModal,
  }))
);

type ActionView = "menu" | "upload" | "profile";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActionModal({ isOpen, onClose }: ActionModalProps) {
  const initialView = useActionModalStore((s) => s.initialView);
  const [view, setView] = useState<ActionView>("menu");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Set initial view when modal opens, reset when it closes
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
    } else {
      setView("menu");
    }
  }, [isOpen, initialView]);

  const handleBack = useCallback(() => {
    setView("menu");
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-start justify-center px-6 pt-28"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 backdrop-blur-2xl"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.92) 70%, rgba(0,0,0,0.97) 100%)",
              WebkitBackdropFilter: "blur(40px)",
            }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-cave-black/90 border border-cave-ash/40 text-cave-fog hover:text-cave-white hover:border-cave-white/50 transition-colors"
            aria-label="Close"
          >
            <svg
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

          <AnimatePresence mode="wait">
            {view === "menu" && (
              <motion.div
                key="menu"
                className="relative z-10 grid grid-cols-2 gap-3 w-full max-w-[280px]"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                style={{ willChange: "transform, opacity" }}
              >
                {/* Upload Flyer option */}
                <button
                  onClick={() => setView("upload")}
                  className="flex flex-col items-center justify-center gap-3 p-5 rounded-xl bg-cave-rock border border-cave-ash hover:border-cave-white transition-colors group"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-cave-fog group-hover:text-cave-white transition-colors"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-sm text-cave-fog group-hover:text-cave-white font-[family-name:var(--font-space-mono)] transition-colors">
                    Upload Flyer
                  </span>
                </button>

                {/* My Profile option */}
                <button
                  onClick={() => setView("profile")}
                  className="flex flex-col items-center justify-center gap-3 p-5 rounded-xl bg-cave-rock border border-cave-ash hover:border-cave-white transition-colors group"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-cave-fog group-hover:text-cave-white transition-colors"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-sm text-cave-fog group-hover:text-cave-white font-[family-name:var(--font-space-mono)] transition-colors">
                    My Profile
                  </span>
                </button>
              </motion.div>
            )}

            {view === "upload" && (
              <Suspense
                key="upload"
                fallback={
                  <div className="relative z-10 flex items-center justify-center w-full max-w-[420px] h-64 rounded-2xl bg-cave-rock border border-cave-ash">
                    <div className="w-6 h-6 border-2 border-cave-fog border-t-cave-white rounded-full animate-spin" />
                  </div>
                }
              >
                <FlyerUploadModal onBack={handleBack} onClose={onClose} />
              </Suspense>
            )}

            {view === "profile" && (
              <Suspense
                key="profile"
                fallback={
                  <div className="relative z-10 flex items-center justify-center w-full max-w-[420px] h-64 rounded-2xl bg-cave-rock border border-cave-ash">
                    <div className="w-6 h-6 border-2 border-cave-fog border-t-cave-white rounded-full animate-spin" />
                  </div>
                }
              >
                <ProfileEditModal onBack={handleBack} onClose={onClose} />
              </Suspense>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
