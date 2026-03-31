"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InfiniteCanvas } from "./infinite-canvas";
import { CanvasHeader } from "@/shared/components/layout/canvas-header";
import { useGeolocation } from "@/shared/hooks/use-geolocation";
import { useLocationStore } from "@/shared/stores/location.store";
import { useRouter } from "next/navigation";

interface FlyerOverlayPageProps {
  flyer: Record<string, unknown>;
  creator?: { username: string; avatar_url: string | null } | null;
}

export function FlyerOverlayPage({ flyer, creator }: FlyerOverlayPageProps) {
  const router = useRouter();
  const [showCard, setShowCard] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(false);

  const { latitude, longitude, loading: geoLoading, error: geoError } = useGeolocation();

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      useLocationStore.getState().setLocation(latitude, longitude);
    } else if (!geoLoading && geoError) {
      useLocationStore.getState().setError(geoError);
    } else if (!geoLoading) {
      useLocationStore.getState().setError("Location unavailable");
    }
  }, [latitude, longitude, geoLoading, geoError]);

  const imageUrl = flyer.image_url as string;
  const title = (flyer.title as string) || "";
  const flyerId = flyer.id as string;
  const username = creator?.username ?? "";

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/flyer/${flyerId}`
    : `/flyer/${flyerId}`;

  const handleShare = async () => {
    const data = {
      title: title || "Check out this event on Caves",
      text: "Found this on Caves — discover events near you!",
      url: shareUrl,
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setToast(true);
        setTimeout(() => setToast(false), 2000);
      } catch {}
    }
    setMenuOpen(false);
  };

  const handleClose = () => {
    setShowCard(false);
    // Navigate to home after animation
    setTimeout(() => router.push("/"), 300);
  };

  return (
    <main className="h-dvh w-screen overflow-hidden bg-cave-black" style={{ position: "fixed", inset: 0 }}>
      {/* Canvas behind */}
      <CanvasHeader />
      <InfiniteCanvas />

      {/* Branded card overlay */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0"
              onClick={handleClose}
              style={{
                background: "rgba(0,0,0,0.88)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            />

            {/* Close X */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-cave-rock/80 text-cave-fog hover:text-cave-white transition-colors safe-area-top"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Card */}
            <motion.div
              className="relative z-10 w-full max-w-[420px]"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <div className="rounded-[28px] bg-cave-stone p-4 pb-5 shadow-[0_20px_80px_rgba(0,0,0,0.8)]">
                {/* Flyer image */}
                <div className="relative w-full overflow-hidden rounded-[20px]" style={{ aspectRatio: "7 / 10" }}>
                  <Image
                    src={imageUrl}
                    alt={title || "Event flyer"}
                    fill
                    sizes="420px"
                    className="object-cover"
                    priority
                    unoptimized
                  />
                </div>

                {/* Bottom: Logo left, Username + menu right */}
                <div className="flex items-center justify-between mt-4 px-1">
                  <Link href="/" className="flex items-center">
                    <Image
                      src="/Logo.png"
                      alt="Caves"
                      width={80}
                      height={28}
                      className="h-auto w-[80px] opacity-80"
                    />
                  </Link>

                  <div className="flex items-center gap-2">
                    {username && (
                      <Link href={`/profile/${username}`} className="text-sm text-cave-fog hover:text-cave-white transition-colors font-[family-name:var(--font-space-mono)]">
                        @{username}
                      </Link>
                    )}

                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-cave-fog hover:text-cave-white transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>

                      <AnimatePresence>
                        {menuOpen && (
                          <motion.div
                            className="absolute bottom-full right-0 mb-2 w-40 rounded-xl bg-cave-rock border border-cave-ash overflow-hidden shadow-lg z-20"
                            initial={{ opacity: 0, scale: 0.9, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 5 }}
                            transition={{ duration: 0.12 }}
                          >
                            <button onClick={handleShare} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-cave-light hover:bg-cave-ash transition-colors text-left">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cave-fog"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                              Share
                            </button>
                            <a href={`https://wa.me/?text=${encodeURIComponent((title || "Check this out") + " — " + shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-cave-light hover:bg-cave-ash transition-colors text-left">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              WhatsApp
                            </a>
                            <button onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setToast(true); setTimeout(() => setToast(false), 2000); } catch {} setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-cave-light hover:bg-cave-ash transition-colors text-left">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cave-fog"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                              Copy link
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Toast */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-white"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  Link copied
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
