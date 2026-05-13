"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { usePendingActionStore } from "@/features/auth/stores/pending-action.store";
import { toggleSaveFlyer, isFlyerSaved } from "../services/favorites.service";
import { getFlyerCreator, getFlyerExtraImages } from "../services/canvas.service";
import type { FlyerExtraImage } from "../services/canvas.service";
import { trackFlyerView, getFlyerViewCount } from "../services/views.service";
import { ReportModal } from "./report-modal";
import { EventInfoLine } from "./event-info-line";
import { MasHoyCarousel } from "./mas-hoy-carousel";
import { useMasHoy } from "../hooks/use-mas-hoy";
import type { LayoutFlyer, NearbyFlyer } from "../types/canvas.types";

// Bookmark icon — filled when saved
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

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
  allFlyers: NearbyFlyer[];
  onClose: () => void;
  onFlyerSelect?: (flyer: NearbyFlyer) => void;
}

export function FlyerDetailModal({ flyer, allFlyers, onClose, onFlyerSelect }: FlyerDetailModalProps) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [savingInProgress, setSavingInProgress] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [viewCount, setViewCount] = useState<number>(0);
  const [shareToast, setShareToast] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [reportToast, setReportToast] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [extraImages, setExtraImages] = useState<FlyerExtraImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const viewTrackedRef = useRef(false);

  const masHoyFlyers = useMasHoy(flyer.id, allFlyers, flyer.event_date ?? null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const daysRemaining = useMemo(() => {
    if (!flyer.expires_at) return null;
    return computeDaysRemaining(flyer.expires_at);
  }, [flyer.expires_at]);

  const allImages = useMemo(
    () => [flyer.image_url, ...extraImages.map((e) => e.image_url)],
    [flyer.image_url, extraImages]
  );

  const hasExtraContent = !!(flyer.description || flyer.social_copy);

  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setCarouselIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const navigateCarousel = useCallback((dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(allImages.length - 1, carouselIndex + dir));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setCarouselIndex(next);
  }, [carouselIndex, allImages.length]);

  // Track view
  useEffect(() => {
    if (viewTrackedRef.current) return;
    const timer = setTimeout(() => {
      viewTrackedRef.current = true;
      trackFlyerView(flyer.id);
    }, 1000);
    return () => clearTimeout(timer);
  }, [flyer.id]);

  useEffect(() => {
    getFlyerViewCount(flyer.id).then(setViewCount);
  }, [flyer.id]);

  useEffect(() => {
    if (!user || !flyer.id) return;
    isFlyerSaved(flyer.id).then(setSaved);
  }, [user, flyer.id]);

  useEffect(() => {
    if (!flyer.user_id) { setCreator(null); return; }
    getFlyerCreator(flyer.user_id).then((data) => {
      if (data) setCreator({ username: data.username, avatar_url: data.avatar_url });
    });
  }, [flyer.user_id]);

  useEffect(() => {
    getFlyerExtraImages(flyer.id).then(setExtraImages).catch(() => {});
  }, [flyer.id]);

  const handleToggleSave = useCallback(async () => {
    if (savingInProgress) return;

    if (!user) {
      usePendingActionStore.getState().setPending({ kind: "save-flyer", flyerId: flyer.id });
      return;
    }

    setSavingInProgress(true);
    try {
      const newState = await toggleSaveFlyer(flyer.id);
      setSaved(newState);
      if (newState) {
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 1200);
      }
    } finally {
      setSavingInProgress(false);
    }
  }, [user, flyer.id, savingInProgress]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: flyer.title || "Check out this event on Caves",
      text: flyer.social_copy || "Found this on Caves — discover events near you!",
      url: `${window.location.origin}/flyer/${flyer.id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      } catch { /* clipboard unavailable */ }
    }
  }, [flyer.id, flyer.title, flyer.social_copy]);

  const handleCopySocialCopy = useCallback(async () => {
    if (!flyer.social_copy) return;
    try {
      await navigator.clipboard.writeText(flyer.social_copy);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    } catch { /* clipboard unavailable */ }
  }, [flyer.social_copy]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxIndex !== null) { setLightboxIndex(null); return; }
        onClose();
      }
      if (lightboxIndex !== null) {
        if (e.key === "ArrowLeft") setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1));
        if (e.key === "ArrowRight") setLightboxIndex((i) => Math.min(allImages.length - 1, (i ?? 0) + 1));
        return;
      }
      if (e.key === "ArrowLeft") navigateCarousel(-1);
      if (e.key === "ArrowRight") navigateCarousel(1);
    },
    [onClose, lightboxIndex, allImages.length, navigateCarousel]
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
      {/* Backdrop — static, no blur animation */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* Close X */}
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

      {/* Scrollable content — centers when short, scrolls when tall */}
      <div
        className="relative z-10 flex-1 overflow-y-auto scrollbar-hide"
        onClick={onClose}
      >
        <div className="min-h-full flex flex-col items-center justify-center px-8 py-16">
          <motion.div
            className="w-full max-w-[400px]"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{ willChange: "transform, opacity" }}
          >
            {/* ── Image carousel ─────────────────────────── */}
            <div className={`relative w-full overflow-hidden rounded-[16px] ${flyer.is_promoted ? "ring-1 ring-amber-500/30" : ""}`}>
              {/* Slides */}
              <div
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                style={{ scrollBehavior: "auto" }}
              >
                {allImages.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className="relative shrink-0 w-full"
                    style={{ aspectRatio: "7 / 10" }}
                  >
                    <Image
                      src={src}
                      alt={i === 0 ? (flyer.title ?? "Event flyer") : `Foto ${i}`}
                      fill
                      sizes="400px"
                      className="object-cover snap-start"
                      loading={i === 0 ? "eager" : "lazy"}
                      unoptimized
                    />
                  </button>
                ))}
              </div>

              {/* Promoted badge */}
              {flyer.is_promoted && (
                <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span className="text-[9px] text-amber-300">Promoted</span>
                </div>
              )}

              {/* Arrow buttons + dot indicators — only when multiple images */}
              {allImages.length > 1 && (
                <>
                  {/* Left arrow */}
                  {carouselIndex > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigateCarousel(-1); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
                      aria-label="Imagen anterior"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                  )}

                  {/* Right arrow */}
                  {carouselIndex < allImages.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigateCarousel(1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
                      aria-label="Imagen siguiente"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  )}

                  {/* Dot indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {allImages.map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-full transition-all duration-200 ${
                          i === carouselIndex
                            ? "w-4 h-1.5 bg-white"
                            : "w-1.5 h-1.5 bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Info line — zona y fecha, sin username */}
            <div className="mt-2 px-1">
              <EventInfoLine
                zoneName={flyer.zone_name}
                eventDate={flyer.event_date}
              />
            </div>

            {/* ── GUARDAR — grande, centrado ──────────────── */}
            <div className="mt-3 flex items-center gap-2">
              <motion.button
                onClick={handleToggleSave}
                disabled={savingInProgress}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={`flex-1 h-[52px] flex items-center justify-center gap-2.5 rounded-full border-2 font-bold tracking-[0.2em] uppercase text-sm transition-colors disabled:opacity-50 ${
                  saved
                    ? "border-[#39FF14] text-[#39FF14] bg-[#39FF14]/8"
                    : "border-cave-ash text-cave-white hover:border-cave-fog"
                }`}
                style={{ fontFamily: "var(--font-space-mono)" }}
                aria-label={saved ? "Guardado" : "Guardar"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {savedFeedback ? (
                    <motion.span
                      key="feedback"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>GUARDADO</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="label"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <BookmarkIcon filled={saved} />
                      <span>{saved ? "GUARDADO" : "GUARDAR"}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <button
                onClick={handleShare}
                className="w-[52px] h-[52px] flex items-center justify-center rounded-full border-2 border-cave-ash text-cave-smoke hover:text-cave-white hover:border-cave-fog transition-colors"
                aria-label="Compartir"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </div>

            {/* Creator link */}
            {creator && (
              <div className="mt-3 px-1">
                <Link
                  href={`/profile/${creator.username}`}
                  className="text-sm text-cave-white hover:text-[#39FF14] transition-colors font-[family-name:var(--font-space-mono)]"
                >
                  @{creator.username}
                </Link>
              </div>
            )}

            {/* ── Extra content ───────────────────────────── */}
            {hasExtraContent && (
              <div className="mt-5 flex flex-col gap-5">
                {flyer.description && (
                  <div className="rounded-2xl bg-cave-stone/60 border border-cave-ash/40 px-4 py-4">
                    <p className="text-[10px] tracking-[0.2em] text-cave-smoke uppercase mb-2 font-[family-name:var(--font-space-mono)]">
                      Acerca del evento
                    </p>
                    <p className="text-sm leading-6 text-cave-fog font-[family-name:var(--font-inter)] line-clamp-3">
                      {flyer.description}
                    </p>
                  </div>
                )}

                {flyer.social_copy && (
                  <div className="rounded-2xl bg-cave-stone/60 border border-cave-ash/40 px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] tracking-[0.2em] text-cave-smoke uppercase font-[family-name:var(--font-space-mono)]">
                        Copy para compartir
                      </p>
                      <button
                        onClick={handleCopySocialCopy}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cave-ash/60 hover:bg-cave-ash text-[10px] text-cave-fog hover:text-cave-white transition-colors font-[family-name:var(--font-space-mono)]"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copiar
                      </button>
                    </div>
                    <p className="text-sm leading-6 text-cave-fog font-[family-name:var(--font-inter)] whitespace-pre-wrap">
                      {flyer.social_copy}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Más hoy carousel */}
            <MasHoyCarousel
              flyers={masHoyFlyers}
              onFlyerSelect={onFlyerSelect ?? (() => {})}
            />

          </motion.div>
        </div>
      </div>

      {/* Lightbox — full screen image viewer with navigation */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxIndex(null)}
          >
            <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
              <Image
                src={allImages[lightboxIndex]}
                alt="Event photo"
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            {/* Prev */}
            {lightboxIndex > 0 && (
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1)); }}
                aria-label="Anterior"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            {/* Next */}
            {lightboxIndex < allImages.length - 1 && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => Math.min(allImages.length - 1, (i ?? 0) + 1)); }}
                aria-label="Siguiente"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {/* Dot indicator */}
            {allImages.length > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {allImages.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-200 ${
                      i === lightboxIndex ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Close */}
            <button
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-cave-rock/80 text-cave-white"
              onClick={() => setLightboxIndex(null)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      {shareToast && (
        <motion.div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-white font-[family-name:var(--font-space-mono)]"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
        >
          Link copied to clipboard
        </motion.div>
      )}
      {copyToast && (
        <motion.div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-white font-[family-name:var(--font-space-mono)]"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
        >
          Copy copiado ✓
        </motion.div>
      )}
      {reportToast && (
        <motion.div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-white font-[family-name:var(--font-space-mono)]"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
        >
          Report submitted. Thank you.
        </motion.div>
      )}

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
