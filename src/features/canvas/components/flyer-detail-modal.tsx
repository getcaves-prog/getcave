"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toggleSaveFlyer, isFlyerSaved } from "../services/favorites.service";
import { getFlyerCreator } from "../services/canvas.service";
import { trackFlyerView, getFlyerViewCount } from "../services/views.service";
import { getFlyerCategories } from "../services/categories.service";
import { ReportModal } from "./report-modal";
import type { Category } from "../services/categories.service";
import type { LayoutFlyer } from "../types/canvas.types";

function computeDaysRemaining(expiresAt: string): number | null {
  const expiryDate = new Date(expiresAt);
  if (isNaN(expiryDate.getTime())) return null;
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

interface CreatorInfo {
  username: string;
  avatar_url: string | null;
}

interface FlyerDetailModalProps {
  flyer: LayoutFlyer;
  onClose: () => void;
}

export function FlyerDetailModal({ flyer, onClose }: FlyerDetailModalProps) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [savingInProgress, setSavingInProgress] = useState(false);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [viewCount, setViewCount] = useState<number>(0);
  const [shareToast, setShareToast] = useState(false);
  const [reportToast, setReportToast] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [flyerCategories, setFlyerCategories] = useState<Category[]>([]);
  const viewTrackedRef = useRef(false);

  const daysRemaining = useMemo(() => {
    if (!flyer.expires_at) return null;
    return computeDaysRemaining(flyer.expires_at);
  }, [flyer.expires_at]);

  // Track view with 1-second debounce (fire and forget)
  useEffect(() => {
    // noop — ID is always a real UUID now
    if (viewTrackedRef.current) return;

    const timer = setTimeout(() => {
      viewTrackedRef.current = true;
      // Fire and forget — non-blocking
      trackFlyerView(flyer.id);
    }, 1000);

    return () => clearTimeout(timer);
  }, [flyer.id]);

  // Fetch view count
  useEffect(() => {
    // noop — ID is always a real UUID now
    getFlyerViewCount(flyer.id).then(setViewCount);
  }, [flyer.id]);

  // Check if flyer is saved by current user
  useEffect(() => {
    if (!user || !flyer.id) return;
    // noop — ID is always a real UUID now
    isFlyerSaved(flyer.id).then(setSaved);
  }, [user, flyer.id]);

  // Fetch creator info
  useEffect(() => {
    if (!flyer.user_id) {
      setCreator(null);
      return;
    }

    getFlyerCreator(flyer.user_id).then((data) => {
      if (data) {
        setCreator({ username: data.username, avatar_url: data.avatar_url });
      }
    });
  }, [flyer.user_id]);

  // Fetch flyer categories
  useEffect(() => {
    // noop — ID is always a real UUID now
    getFlyerCategories(flyer.id).then(setFlyerCategories).catch(() => {});
  }, [flyer.id]);

  const handleToggleSave = useCallback(async () => {
    if (!user || savingInProgress) return;
    // noop — ID is always a real UUID now

    setSavingInProgress(true);
    try {
      const newState = await toggleSaveFlyer(flyer.id);
      setSaved(newState);
    } finally {
      setSavingInProgress(false);
    }
  }, [user, flyer.id, savingInProgress]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: flyer.title || "Check out this event on Caves",
      text: "Found this on Caves — discover events near you!",
      url: `${window.location.origin}/flyer/${flyer.id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled — do nothing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      } catch {
        // Clipboard API not available
      }
    }
  }, [flyer.id, flyer.title]);

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
      className="fixed inset-0 z-50 flex flex-col safe-area-bottom"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ willChange: "opacity" }}
    >
      {/* Full-screen blurred backdrop */}
      <motion.div
        className="absolute inset-0"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: "rgba(0,0,0,0.92)",
          WebkitBackdropFilter: "blur(40px)",
          backdropFilter: "blur(40px)",
        }}
      />

      {/* Close X — top right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-cave-rock/80 text-cave-fog hover:text-cave-white transition-colors safe-area-top"
        aria-label="Close"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Spotify-style card — centered */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center flex-1 px-8"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{ willChange: "transform, opacity" }}
      >
        {/* The card */}
        <div className="relative w-full max-w-[400px]">
          {/* Flyer image */}
          <div
            className={`relative w-full overflow-hidden rounded-[16px] ${flyer.is_promoted ? "ring-1 ring-amber-500/30" : ""}`}
            style={{ aspectRatio: "7 / 10" }}
          >
            <Image
              src={flyer.image_url}
              alt={flyer.title ?? "Event flyer"}
              fill
              sizes="400px"
              className="object-cover"
              loading="eager"
              unoptimized
            />
            {flyer.is_promoted && (
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="text-[9px] text-amber-300">Promoted</span>
              </div>
            )}
          </div>

          {/* Bottom bar — dark bg for contrast */}
          <div className="flex items-center justify-between mt-2 px-4 py-3 rounded-b-[16px] bg-cave-stone">
            {creator ? (
              <Link href={`/profile/${creator.username}`} className="text-xs text-cave-fog hover:text-cave-white transition-colors font-[family-name:var(--font-space-mono)]">
                @{creator.username}
              </Link>
            ) : <div />}

            <div className="flex items-center gap-2">
              {/* Save */}
              {user && (
                <button onClick={handleToggleSave} disabled={savingInProgress} className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 ${saved ? "text-cave-white" : "text-cave-smoke hover:text-cave-white"}`} aria-label={saved ? "Saved" : "Save"}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                </button>
              )}
              {/* Share — native share on mobile, copy link on desktop */}
              <button onClick={handleShare} className="w-8 h-8 flex items-center justify-center rounded-full text-cave-smoke hover:text-cave-white transition-colors" aria-label="Share">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Category pills below card */}
        {flyerCategories.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-3 justify-center">
            {flyerCategories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cave-rock/50 text-[10px] text-cave-smoke"
              >
                {cat.icon && <span>{cat.icon}</span>}
                {cat.name}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Share toast — bottom center */}
      {shareToast && (
        <motion.div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-white font-[family-name:var(--font-space-mono)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          Link copied to clipboard
        </motion.div>
      )}

      {/* Report toast */}
      {reportToast && (
        <motion.div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-white font-[family-name:var(--font-space-mono)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          Report submitted. Thank you.
        </motion.div>
      )}

      {/* Report modal */}
      <AnimatePresence>
        {showReport && (
          <ReportModal
            flyerId={flyer.id}
            onClose={() => setShowReport(false)}
            onReported={() => {
              setShowReport(false);
              setReportToast(true);
              setTimeout(() => setReportToast(false), 2000);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
