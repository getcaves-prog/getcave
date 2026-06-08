"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Flyer } from "../types/community.types";

// ─── Overflow menu action ────────────────────────────────────────────────────
export interface OverflowAction {
  label: string;
  onClick: () => void;
  /** When true, renders in the destructive (pink) tone. */
  destructive?: boolean;
  icon?: React.ReactNode;
}

interface CommunityBannerCollageProps {
  /** Past events whose images build the collage. */
  pastEvents: Flyer[];
  /** Fallback cover when there are few/no past-event images. */
  coverUrl: string | null;
  communityName: string;
  /** Actions shown in the "..." overflow menu (admin/secondary). */
  actions: OverflowAction[];
}

// ─── Banner collage ──────────────────────────────────────────────────────────
// Top-of-page horizontal collage of past-event thumbnails. Overlays a back
// button (left) and a "..." overflow menu (right) holding secondary/admin
// actions. Falls back to the cover image when there are not enough past events.
export function CommunityBannerCollage({
  pastEvents,
  coverUrl,
  communityName,
  actions,
}: CommunityBannerCollageProps) {
  const prefersReducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Build the collage tile sources: prefer past-event images, fall back to cover.
  const eventImages = pastEvents
    .map((e) => e.image_url)
    .filter((url): url is string => !!url)
    .slice(0, 5);

  const tiles = eventImages.length >= 2 ? eventImages : coverUrl ? [coverUrl] : [];

  return (
    <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-cave-stone">
      {/* Collage / cover */}
      {tiles.length > 1 ? (
        <div className="absolute inset-0 flex">
          {tiles.map((src, i) => (
            <div key={i} className="relative flex-1 h-full">
              <Image
                src={src}
                alt={`${communityName} recap ${i + 1}`}
                fill
                sizes="20vw"
                className="object-cover"
                unoptimized
                priority={i === 0}
              />
              {i > 0 && <span className="absolute inset-y-0 left-0 w-px bg-cave-black/40" aria-hidden="true" />}
            </div>
          ))}
        </div>
      ) : tiles.length === 1 ? (
        <Image
          src={tiles[0]}
          alt={`Portada de ${communityName}`}
          fill
          className="object-cover"
          unoptimized
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-cave-stone/60" />
      )}

      {/* Top gradient for control legibility + bottom fade into page */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cave-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-cave-black to-transparent" />

      {/* Back button */}
      <Link
        href="/communities"
        className="absolute top-3 left-3 w-10 h-10 rounded-full bg-cave-black/60 backdrop-blur-sm border border-cave-ash/40 flex items-center justify-center text-cave-white hover:bg-cave-black/80 transition-colors"
        aria-label="Volver a comunidades"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </Link>

      {/* Overflow menu */}
      {actions.length > 0 && (
        <div className="absolute top-3 right-3" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-10 h-10 rounded-full bg-cave-black/60 backdrop-blur-sm border border-cave-ash/40 flex items-center justify-center text-cave-white hover:bg-cave-black/80 transition-colors"
            aria-label="Más opciones"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                role="menu"
                initial={prefersReducedMotion ? false : { opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="absolute top-12 right-0 min-w-[200px] rounded-xl bg-cave-stone border border-cave-ash/60 shadow-xl overflow-hidden z-50"
              >
                {actions.map((action, i) => (
                  <button
                    key={i}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      action.onClick();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-[family-name:var(--font-space-mono)] uppercase tracking-[0.08em] transition-colors ${
                      action.destructive
                        ? "text-[#FF2D7B] hover:bg-[#FF2D7B]/10"
                        : "text-cave-light hover:bg-cave-ash/40"
                    } ${i > 0 ? "border-t border-cave-ash/40" : ""}`}
                  >
                    {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
