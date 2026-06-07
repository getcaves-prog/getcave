"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOpenChatsStore } from "@/features/conversations/stores/open-chats.store";
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
import { useAttendance } from "../hooks/use-attendance";
import { useMasHoy } from "../hooks/use-mas-hoy";
import { QrPasscodeModal } from "@/features/invitations/components/qr-passcode-modal";
import { QrDisplayModal } from "@/features/invitations/components/qr-display-modal";
import { getInvitationStatus, getMyInviteForFlyer, verifyAndGetInvite } from "@/features/invitations/services/invitation.service";
import type { GenerateInviteResult, QrInvite } from "@/features/invitations/types/invitation.types";
// Cross-feature: Recaps are presented via a lateral modal (not inline accordion).
// RecapsModal wraps RecapsGallery — no chat logic duplicated here.
import { RecapsModal } from "./recaps-modal";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import type { LayoutFlyer, NearbyFlyer } from "../types/canvas.types";

// ─── Titleless-flyer identifier ────────────────────────────────────────────
// When a flyer has no title (no community, no label), derive a short readable
// code so chat heads and UI always have something distinguishable to show.
function getFlyerDisplayName(flyer: Pick<LayoutFlyer, "id" | "title">): string {
  if (flyer.title && flyer.title.trim().length > 0) return flyer.title;
  return `Evento ${flyer.id.slice(0, 4).toUpperCase()}`;
}

// ─── Icon components ───────────────────────────────────────────────────────

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="13" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
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

// ─── MetricItem ────────────────────────────────────────────────────────────
// Single metric: icon + number + label. Sober and compact.
function MetricItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-cave-smoke">{icon}</span>
      <span
        className="text-[15px] font-bold leading-none text-cave-white tabular-nums"
        style={{ fontFamily: "var(--font-space-mono)" }}
      >
        {value}
      </span>
      <span
        className="text-[9px] uppercase tracking-[0.14em] text-cave-fog leading-none"
        style={{ fontFamily: "var(--font-space-mono)" }}
      >
        {label}
      </span>
    </div>
  );
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
  const [invitationEnabled, setInvitationEnabled] = useState(false);
  const [myInvite, setMyInvite] = useState<QrInvite | null>(null);
  const [showQrPasscode, setShowQrPasscode] = useState(false);
  const [showQrDisplay, setShowQrDisplay] = useState(false);
  const [qrResult, setQrResult] = useState<GenerateInviteResult | null>(null);
  const [showRecaps, setShowRecaps] = useState(false);
  const viewTrackedRef = useRef(false);
  const openChat = useOpenChatsStore((s) => s.openChat);

  // Attendance state — single source of truth for VOY + VOY SOLO buttons.
  const attendance = useAttendance(flyer.id, user?.id);
  const requestSignIn = useCallback(() => {
    usePendingActionStore.getState().setPending({ kind: "save-flyer", flyerId: flyer.id });
  }, [flyer.id]);

  const masHoyFlyers = useMasHoy(flyer.id, allFlyers, flyer.event_date ?? null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const daysRemaining = useMemo(() => {
    if (!flyer.expires_at) return null;
    return computeDaysRemaining(flyer.expires_at);
  }, [flyer.expires_at]);

  const allImages = useMemo(
    () => [flyer.image_url, ...extraImages.map((e) => e.image_url)],
    [flyer.image_url, extraImages]
  );

  const hasExtraContent = !!(flyer.description || flyer.social_copy);

  // ── Place/community pill label ─────────────────────────────────────────
  // community_id exists on flyer but we have no getCommunityById service without
  // scope creep — fall back to zone_name. A future enhancement can add the fetch.
  const placePillLabel = flyer.zone_name ?? getFlyerDisplayName(flyer);

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

  useEffect(() => {
    getInvitationStatus(flyer.id)
      .then((s) => {
        if (!s) return;
        setInvitationEnabled(s.enabled);
        if (s.enabled && user) {
          getMyInviteForFlyer(flyer.id).then(setMyInvite).catch(() => {});
        }
      })
      .catch(() => {});
  }, [flyer.id, user]);

  const handleQrButtonClick = useCallback(() => {
    if (myInvite) {
      setQrResult({
        qr_token: myInvite.qr_token,
        display_name: myInvite.display_name,
        phone: myInvite.phone,
        flyer_title: getFlyerDisplayName(flyer),
        already_existed: true,
      });
      setShowQrDisplay(true);
    } else {
      setShowQrPasscode(true);
    }
  }, [myInvite, flyer]);

  const handleQrVerify = useCallback(async (passcode: string, displayName: string, phone: string | null) => {
    const result = await verifyAndGetInvite(flyer.id, passcode, displayName, phone);
    setMyInvite({ id: "", flyer_id: flyer.id, user_id: user?.id ?? "", qr_token: result.qr_token, display_name: result.display_name, phone, checked_in: false, checked_in_at: null, created_at: "" });
    setQrResult({ ...result, phone, flyer_title: getFlyerDisplayName(flyer) });
    setShowQrPasscode(false);
    setShowQrDisplay(true);
  }, [flyer, user]);

  const isOwner = user?.id === flyer.user_id;

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

  // Suppress unused warning — savedFeedback drives visual feedback elsewhere
  void savedFeedback;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col safe-area-bottom"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ willChange: "opacity" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* Close X */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-cave-rock/80 text-cave-fog hover:text-cave-white transition-colors safe-area-top"
        aria-label="Cerrar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Scrollable content */}
      <div
        className="relative z-10 flex-1 overflow-y-auto scrollbar-hide"
        onClick={onClose}
      >
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-16 md:px-8">
          <motion.div
            className="relative w-full max-w-[420px] md:max-w-[780px]"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{ willChange: "transform, opacity" }}
          >
            {/* ═══════════════════════════════════════════════════════════════
                Desktop: side-by-side layout (image left, content right)
                Mobile:  stacked layout (image top, content below)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="md:flex md:gap-6 md:items-start">

              {/* ── Image carousel ─────────────────────────── */}
              <div className={`relative w-full md:w-[340px] md:flex-none overflow-hidden rounded-2xl ${flyer.is_promoted ? "ring-1 ring-amber-500/30" : ""}`}>
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
                      className="relative flex-none w-full snap-start"
                      style={{ aspectRatio: "7 / 10" }}
                    >
                      <Image
                        src={src}
                        alt={i === 0 ? (flyer.title ?? "Event flyer") : `Foto ${i}`}
                        fill
                        sizes="(min-width: 768px) 340px, 420px"
                        className="object-cover"
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

              {/* ── Right column (desktop) / Below image (mobile) ─────────── */}
              <div className="flex-1 min-w-0 flex flex-col gap-3 mt-3 md:mt-0">

                {/* ── 1. Place / community pill ───────────────────────────────
                     Full-width-ish dark rounded pill — zone_name or fallback.
                     On desktop it sits at the top of the right column.
                ─────────────────────────────────────────────────────────── */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-cave-stone border border-cave-ash/50">
                  <span className="text-cave-smoke shrink-0">
                    <MapPinIcon />
                  </span>
                  <span
                    className="text-[12px] font-bold uppercase tracking-[0.16em] text-cave-white truncate"
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    {placePillLabel}
                  </span>
                </div>

                {/* ── 2. Meta + metrics row ───────────────────────────────────
                     LEFT col: zone · day · time + creator username (small)
                     RIGHT col: three metrics stacked
                ─────────────────────────────────────────────────────────── */}
                <div className="flex items-start gap-4 px-1">
                  {/* Left: event meta */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <EventInfoLine
                      username={undefined}
                      zoneName={flyer.zone_name}
                      eventDate={flyer.event_date}
                    />
                    {flyer.event_time && (
                      <p
                        className="text-[11px] text-cave-smoke uppercase tracking-[0.12em] leading-none"
                        style={{ fontFamily: "var(--font-space-mono)" }}
                      >
                        {flyer.event_time}
                      </p>
                    )}
                    {creator && (
                      <Link
                        href={`/profile/${creator.username}`}
                        className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-cave-fog hover:text-cave-white transition-colors font-[family-name:var(--font-space-mono)] leading-none"
                      >
                        @{creator.username}
                      </Link>
                    )}
                  </div>

                  {/* Right: metrics */}
                  <div className="shrink-0 flex items-center gap-4 px-4 py-3 rounded-2xl bg-cave-stone/70 border border-cave-ash/40">
                    <MetricItem
                      icon={<EyeIcon />}
                      value={viewCount}
                      label="Vistas"
                    />
                    <div className="w-px h-8 bg-cave-ash/50" />
                    <MetricItem
                      icon={<GroupIcon />}
                      value={attendance.total}
                      label="Van"
                    />
                    <div className="w-px h-8 bg-cave-ash/50" />
                    <MetricItem
                      icon={<PersonIcon />}
                      value={attendance.solo}
                      label="Van solos"
                    />
                  </div>
                </div>

                {/* ── 3. Actions row: Voy · Voy solo + save + share ───────────
                     "Voy" = going (group), "Voy solo" = going solo.
                     Active = white fill; inactive = dark outline.
                     Save (bookmark) + share as icon buttons to the right.
                ─────────────────────────────────────────────────────────── */}
                <div className="flex items-center gap-2 px-1">
                  {/* VOY — going (group) */}
                  <motion.button
                    type="button"
                    onClick={() => {
                      if (!user?.id) { requestSignIn(); return; }
                      void attendance.toggleGoing();
                    }}
                    disabled={attendance.loading}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={`flex-1 h-[46px] flex items-center justify-center gap-2 rounded-full border-2 text-[12px] font-bold uppercase tracking-[0.18em] transition-all disabled:opacity-50 font-[family-name:var(--font-space-mono)] ${
                      attendance.going && !attendance.goingSolo
                        ? "border-white text-cave-black bg-white shadow-[0_0_14px_rgba(255,255,255,0.15)]"
                        : "border-cave-ash text-cave-fog bg-cave-rock/60 hover:border-cave-fog hover:text-cave-white"
                    }`}
                    aria-pressed={attendance.going && !attendance.goingSolo}
                    aria-label={attendance.going && !attendance.goingSolo ? "Cancelar asistencia" : "Marcar que voy"}
                  >
                    <GroupIcon />
                    <span>{attendance.going && !attendance.goingSolo ? "Voy ✓" : "Voy"}</span>
                  </motion.button>

                  {/* VOY SOLO */}
                  <motion.button
                    type="button"
                    onClick={() => {
                      if (!user?.id) { requestSignIn(); return; }
                      void attendance.toggleSolo();
                    }}
                    disabled={attendance.loading}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={`flex-1 h-[46px] flex items-center justify-center gap-2 rounded-full border-2 text-[12px] font-bold uppercase tracking-[0.18em] transition-all disabled:opacity-50 font-[family-name:var(--font-space-mono)] ${
                      attendance.goingSolo
                        ? "border-white text-cave-black bg-white shadow-[0_0_14px_rgba(255,255,255,0.15)]"
                        : "border-cave-ash text-cave-fog bg-cave-rock/60 hover:border-cave-fog hover:text-cave-white"
                    }`}
                    aria-pressed={attendance.goingSolo}
                    aria-label={attendance.goingSolo ? "Cancelar — voy solo" : "Marcar que voy solo"}
                  >
                    <PersonIcon />
                    <span>{attendance.goingSolo ? "Solo ✓" : "Voy solo"}</span>
                  </motion.button>

                  {/* Divider */}
                  <div className="w-px h-8 bg-cave-ash/50 shrink-0" />

                  {/* Save bookmark */}
                  <motion.button
                    onClick={handleToggleSave}
                    disabled={savingInProgress}
                    whileTap={{ scale: 0.93 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={`w-[44px] h-[44px] flex items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50 shrink-0 ${
                      saved
                        ? "border-white text-white bg-white/10"
                        : "border-cave-ash text-cave-smoke hover:border-cave-fog hover:text-cave-white"
                    }`}
                    aria-label={saved ? "Guardado" : "Guardar"}
                  >
                    <BookmarkIcon filled={saved} />
                  </motion.button>

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    className="w-[44px] h-[44px] flex items-center justify-center rounded-full border-2 border-cave-ash text-cave-smoke hover:text-cave-white hover:border-cave-fog transition-colors shrink-0"
                    aria-label="Compartir"
                  >
                    <ShareIcon />
                  </button>
                </div>

                {/* ── 4. Conversación bar ──────────────────────────────────────
                     Wide dark bar that opens the floating chat head.
                ─────────────────────────────────────────────────────────── */}
                <motion.button
                  type="button"
                  onClick={() => openChat({ subjectType: "flyer", subjectId: flyer.id, label: getFlyerDisplayName(flyer) })}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="w-full h-[50px] flex items-center justify-between px-5 rounded-2xl bg-cave-stone border border-cave-ash/60 hover:border-cave-ash hover:bg-cave-rock transition-colors group"
                  aria-label="Abrir conversación del evento"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-cave-fog group-hover:text-cave-white transition-colors">
                      <ChatIcon />
                    </span>
                    <span
                      className="text-[12px] font-bold uppercase tracking-[0.18em] text-cave-fog group-hover:text-cave-white transition-colors"
                      style={{ fontFamily: "var(--font-space-mono)" }}
                    >
                      Conversación
                    </span>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-cave-smoke group-hover:text-cave-fog transition-colors"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </motion.button>

                {/* ── 5. QR Invitation button ──────────────────────────────── */}
                {invitationEnabled && !isOwner && (
                  <motion.button
                    type="button"
                    onClick={handleQrButtonClick}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="w-full h-[48px] flex items-center justify-center gap-2.5 rounded-full bg-cave-white text-cave-black font-bold tracking-[0.15em] uppercase text-sm border-2 border-cave-white/80 hover:bg-white transition-colors"
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" />
                      <rect x="3" y="16" width="5" height="5" rx="1" />
                      <path d="M21 16h-3a2 2 0 0 0-2 2v3" /><line x1="21" y1="21" x2="21" y2="21" />
                      <line x1="12" y1="3" x2="12" y2="7" /><line x1="12" y1="12" x2="12" y2="12" />
                      <line x1="3" y1="12" x2="7" y2="12" />
                    </svg>
                    {myInvite ? "Ver mi QR" : "Generar mi QR"}
                  </motion.button>
                )}

                {/* ── 6. Extra content ─────────────────────────────────────── */}
                {hasExtraContent && (
                  <div className="flex flex-col gap-3">
                    {flyer.description && (
                      <div className="rounded-2xl bg-cave-stone/60 border border-cave-ash/40 p-5">
                        <SectionHeading>Acerca del evento</SectionHeading>
                        <p className="text-sm leading-6 text-cave-fog font-[family-name:var(--font-inter)] line-clamp-3">
                          {flyer.description}
                        </p>
                      </div>
                    )}

                    {flyer.social_copy && (
                      <div className="rounded-2xl bg-cave-stone/60 border border-cave-ash/40 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="border-l-2 border-white/50 pl-2.5 text-[10px] uppercase tracking-[0.2em] text-cave-fog font-[family-name:var(--font-space-mono)]">
                            Copy para compartir
                          </span>
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

                {/* ── 7. Recaps lateral modal trigger ──────────────────────── */}
                <motion.button
                  type="button"
                  onClick={() => setShowRecaps(true)}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-cave-stone/60 border border-cave-ash/40 hover:border-cave-ash/70 hover:bg-cave-stone/80 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-cave-ash/30 group-hover:bg-cave-ash/50 transition-colors">
                      <svg
                        width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="text-cave-white"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-cave-white font-[family-name:var(--font-space-mono)]">
                        Recaps
                      </span>
                      <span className="text-[10px] text-cave-ash font-[family-name:var(--font-inter)]">
                        Fotos y videos del evento
                      </span>
                    </div>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-cave-smoke group-hover:text-cave-fog transition-colors"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </motion.button>

                {/* ── 8. Más hoy carousel ───────────────────────────────────── */}
                <MasHoyCarousel
                  flyers={masHoyFlyers}
                  onFlyerSelect={onFlyerSelect ?? (() => {})}
                />

              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Recaps lateral modal */}
      <AnimatePresence>
        {showRecaps && (
          <RecapsModal
            flyerId={flyer.id}
            isOwner={isOwner}
            onClose={() => setShowRecaps(false)}
          />
        )}
      </AnimatePresence>

      {/* QR modals */}
      <AnimatePresence>
        {showQrPasscode && (
          <QrPasscodeModal
            flyerTitle={getFlyerDisplayName(flyer)}
            onVerify={handleQrVerify}
            onClose={() => setShowQrPasscode(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showQrDisplay && qrResult && (
          <QrDisplayModal
            qrToken={qrResult.qr_token}
            displayName={qrResult.display_name}
            flyerTitle={qrResult.flyer_title ?? null}
            alreadyExisted={qrResult.already_existed}
            onClose={() => setShowQrDisplay(false)}
          />
        )}
      </AnimatePresence>

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
            <div className="relative w-full h-full pointer-events-none">
              <Image
                src={allImages[lightboxIndex]}
                alt="Event photo"
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            {lightboxIndex > 0 && (
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1)); }}
                aria-label="Anterior"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            {lightboxIndex < allImages.length - 1 && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => Math.min(allImages.length - 1, (i ?? 0) + 1)); }}
                aria-label="Siguiente"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5">
                {allImages.length > 1 && allImages.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-200 ${
                      i === lightboxIndex ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>

              <button
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm border border-white/20"
                onClick={() => setLightboxIndex(null)}
                aria-label="Cerrar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      {shareToast && (
        <motion.div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-white font-[family-name:var(--font-space-mono)]"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
        >
          Link copiado al portapapeles
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
          Reporte enviado. Gracias.
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
