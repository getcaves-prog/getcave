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

  // Always open directly to upload — no menu
  useEffect(() => {
    if (isOpen) {
      setView("upload");
    } else {
      setView("upload");
    }
  }, [isOpen]);

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

          {/* Upload modal — directly, no menu */}
          <Suspense
            fallback={
              <div className="relative z-10 flex items-center justify-center w-full max-w-[420px] h-64 rounded-2xl bg-cave-rock border border-cave-ash">
                <div className="w-6 h-6 border-2 border-cave-fog border-t-cave-white rounded-full animate-spin" />
              </div>
            }
          >
            <div className="relative z-10">
              {/* Close X — top right of the upload modal */}
              <button
                onClick={onClose}
                className="absolute -top-3 -right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-cave-black border border-cave-ash text-cave-fog hover:text-cave-white transition-colors"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <FlyerUploadModal onBack={onClose} onClose={onClose} />
            </div>
          </Suspense>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
