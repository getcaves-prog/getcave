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
        <div className="relative w-full max-w-[380px] rounded-3xl bg-cave-stone/90 p-5 pb-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          {/* Flyer image — inside card */}
          <div
            className={`relative w-full overflow-hidden rounded-2xl mb-4 ${flyer.is_promoted ? "ring-1 ring-amber-500/30" : ""}`}
            style={{ aspectRatio: "7 / 10" }}
          >
            <Image
              src={flyer.image_url}
              alt={flyer.title ?? "Event flyer"}
              fill
              sizes="380px"
              className="object-cover"
              loading="eager"
              unoptimized
            />
            {flyer.is_promoted && (
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="text-[9px] text-amber-300">Promoted</span>
              </div>
            )}
          </div>

          {/* Title if exists */}
          {flyer.title && (
            <h2 className="text-lg text-cave-white font-bold leading-tight mb-1 truncate">
              {flyer.title}
            </h2>
          )}

            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent((flyer.title || "Check this out") + " — " + window.location.origin + "/flyer/" + flyer.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-rock hover:bg-cave-ash transition-colors"
              aria-label="Share on WhatsApp"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            {/* Instagram */}
            <button
              onClick={handleShare}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-rock hover:bg-cave-ash transition-colors"
              aria-label="Share on Instagram"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E4405F]">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </button>
            {/* X/Twitter */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent((flyer.title || "Check this out") + " — Found on Caves")}&url=${encodeURIComponent(window.location.origin + "/flyer/" + flyer.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-rock hover:bg-cave-ash transition-colors"
              aria-label="Share on X"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-cave-white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            {/* Copy link */}
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${window.location.origin}/flyer/${flyer.id}`);
                  setShareToast(true);
                  setTimeout(() => setShareToast(false), 2000);
                } catch {}
              }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-rock hover:bg-cave-ash transition-colors"
              aria-label="Copy link"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cave-fog">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
          </div>

          {/* Share row — social icons + save + copy link */}
          <div className="flex items-center gap-2 mb-3">
            {/* Save */}
            {user && (
              <button
                onClick={handleToggleSave}
                disabled={savingInProgress}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                  saved
                    ? "bg-cave-white text-cave-black"
                    : "bg-cave-rock hover:bg-cave-ash text-cave-smoke hover:text-cave-white"
                }`}
                aria-label={saved ? "Saved" : "Save"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            )}
            {/* WhatsApp */}
          {creator && (
            <Link
              href={`/profile/${creator.username}`}
              className="flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden bg-cave-rock border border-cave-ash shrink-0">
                {creator.avatar_url ? (
                  <Image
                    src={creator.avatar_url}
                    alt={creator.username}
                    width={28}
                    height={28}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cave-smoke">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
              <span className="text-sm text-cave-fog group-hover:text-cave-white transition-colors">
                @{creator.username}
              </span>
            </Link>
          )}
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
