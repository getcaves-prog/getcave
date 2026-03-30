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
  const [flyerCategories, setFlyerCategories] = useState<Category[]>([]);
  const viewTrackedRef = useRef(false);

  const daysRemaining = useMemo(() => {
    if (!flyer.expires_at) return null;
    return computeDaysRemaining(flyer.expires_at);
  }, [flyer.expires_at]);

  // Track view with 1-second debounce (fire and forget)
  useEffect(() => {
    if (flyer.id.includes(",")) return;
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
    if (flyer.id.includes(",")) return;
    getFlyerViewCount(flyer.id).then(setViewCount);
  }, [flyer.id]);

  // Check if flyer is saved by current user
  useEffect(() => {
    if (!user || !flyer.id) return;
    if (flyer.id.includes(",")) return;
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
    if (flyer.id.includes(",")) return;
    getFlyerCategories(flyer.id).then(setFlyerCategories).catch(() => {});
  }, [flyer.id]);

  const handleToggleSave = useCallback(async () => {
    if (!user || savingInProgress) return;
    if (flyer.id.includes(",")) return;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-6 safe-area-bottom"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ willChange: "opacity" }}
    >
      {/* Gaussian blur backdrop */}
      <motion.div
        className="absolute inset-0 backdrop-blur-2xl"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: "radial-gradient(ellipse at center, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.92) 70%, rgba(0,0,0,0.97) 100%)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      />

      {/* Content — emerges from deep in the cave */}
      <motion.div
        className="relative z-10 flex flex-col items-center max-w-[420px] w-full"
        initial={{ scale: 0.15, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.15, opacity: 0, y: 40 }}
        transition={{
          type: "spring",
          stiffness: 240,
          damping: 26,
          mass: 0.9,
        }}
        style={{ willChange: "transform, opacity" }}
      >
        {/* Save button — top left (only for authenticated users) */}
        {user && !flyer.id.includes(",") && (
          <button
            onClick={handleToggleSave}
            disabled={savingInProgress}
            className="absolute -top-3 -left-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-cave-black/90 border border-cave-ash/40 text-cave-fog hover:text-cave-white hover:border-cave-white/50 transition-colors disabled:opacity-50"
            aria-label={saved ? "Remove from saved" : "Save flyer"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={saved ? "text-cave-white" : ""}
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}

        {/* Top right buttons: Share + Close */}
        <div className="absolute -top-3 -right-3 z-20 flex items-center gap-1.5">
          {/* Share button */}
          {!flyer.id.includes(",") && (
            <button
              onClick={handleShare}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-black/90 border border-cave-ash/40 text-cave-fog hover:text-cave-white hover:border-cave-white/50 transition-colors"
              aria-label="Share flyer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-black/90 border border-cave-ash/40 text-cave-fog hover:text-cave-white hover:border-cave-white/50 transition-colors"
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
        </div>

        {/* Flyer image */}
        <motion.div
          className={`relative w-full overflow-hidden ${flyer.is_promoted ? "ring-1 ring-amber-500/30" : ""}`}
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
            sizes="420px"
            className="object-cover"
            loading="eager"
            unoptimized
          />
          {/* Promoted badge */}
          {flyer.is_promoted && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-[10px] text-amber-300 font-[family-name:var(--font-space-mono)]">Promoted</span>
            </div>
          )}
        </motion.div>

        {/* Creator info */}
        {creator ? (
          <Link
            href={`/profile/${creator.username}`}
            className="mt-3 flex items-center gap-2 group"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-cave-stone border border-cave-ash shrink-0">
              {creator.avatar_url ? (
                <Image
                  src={creator.avatar_url}
                  alt={creator.username}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-cave-smoke"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-xs text-cave-fog group-hover:text-cave-white transition-colors font-[family-name:var(--font-space-mono)]">
              @{creator.username}
            </span>
          </Link>
        ) : !flyer.user_id ? (
          <div className="mt-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cave-stone border border-cave-ash flex items-center justify-center shrink-0">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-cave-smoke"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
              Anonymous
            </span>
          </div>
        ) : null}

        {/* Category pills */}
        {flyerCategories.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
            {flyerCategories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-fog font-[family-name:var(--font-space-mono)]"
              >
                {cat.icon && <span>{cat.icon}</span>}
                {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* Expiry badge + View count + Report row */}
        <div className="mt-3 flex items-center justify-center gap-3">
          {/* View count */}
          {!flyer.id.includes(",") && (
            <span className="inline-flex items-center gap-1 text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {viewCount}
            </span>
          )}

          {/* Expiry badge */}
          {daysRemaining !== null && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {daysRemaining === 0
                ? "Expires today"
                : `Expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`}
            </span>
          )}

          {/* Report button */}
          {user && !flyer.id.includes(",") && (
            <button
              onClick={() => setShowReport(true)}
              className="inline-flex items-center gap-1 text-xs text-cave-smoke hover:text-cave-fog transition-colors font-[family-name:var(--font-space-mono)]"
              aria-label="Report flyer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              Report
            </button>
          )}
        </div>
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
