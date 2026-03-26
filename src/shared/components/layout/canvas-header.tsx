"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import Link from "next/link";
import { LocationSearch } from "@/shared/components/layout/location-search";
import { ActionModal } from "@/shared/components/layout/action-modal";

interface CanvasHeaderProps {
  hidelogo?: boolean;
}

export function CanvasHeader({ hidelogo }: CanvasHeaderProps) {
  const { user, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleUploadClick = () => {
    if (!user) {
      window.location.href = "/auth/signup";
      return;
    }
    setActionModalOpen(true);
  };

  const openSearch = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setLocked(false);
  }, []);

  // Desktop: hover opens, leaving starts a close timer
  const handleZoneMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setSearchOpen(true);
  }, []);

  const handleZoneMouseLeave = useCallback(() => {
    if (locked) return; // Don't close if user clicked/interacted with search
    closeTimeoutRef.current = setTimeout(() => {
      setSearchOpen(false);
    }, 300);
  }, [locked]);

  // Lock search open when user interacts with it (click/focus)
  const handleSearchInteraction = useCallback(() => {
    setLocked(true);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 backdrop-blur-md safe-area-top transition-colors duration-300"
      style={{
        minHeight: 56,
        paddingTop: "max(env(safe-area-inset-top), 0px)",
        backgroundColor: hovered ? "rgba(5, 5, 5, 0.75)" : "rgba(5, 5, 5, 0.35)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setTimeout(() => setHovered(false), 1000)}
    >
      {/* Left: Auth action */}
      {user ? (
        <button
          onClick={() => signOut()}
          className="text-cave-fog text-xs font-[family-name:var(--font-space-mono)] tracking-wide uppercase hover:text-cave-white transition-colors"
        >
          Log out
        </button>
      ) : (
        <Link
          href="/auth/login"
          className="flex items-center justify-center w-11 h-11 text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Sign up"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </Link>
      )}

      {/* Center: Logo + Search zone — hover area includes dropdown */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        onMouseEnter={handleZoneMouseEnter}
        onMouseLeave={handleZoneMouseLeave}
      >
        <div className="flex items-center gap-2">
          {/* Desktop: logo is clickable + hoverable */}
          <h1
            className="text-4xl text-cave-white font-[family-name:var(--font-pinyon-script)] transition-opacity duration-300 cursor-pointer hidden md:block"
            style={{ opacity: hidelogo ? 0 : 1 }}
            onClick={() => { openSearch(); handleSearchInteraction(); }}
          >
            Caves
          </h1>

          {/* Mobile: logo only — tap opens search */}
          <h1
            className="text-4xl text-cave-white font-[family-name:var(--font-pinyon-script)] transition-opacity duration-300 cursor-pointer md:hidden"
            style={{ opacity: hidelogo ? 0 : 1 }}
            onClick={() => { openSearch(); handleSearchInteraction(); }}
          >
            Caves
          </h1>
        </div>

        {/* Search dropdown — inside hover zone so mouse can move to it */}
        <LocationSearch
          isOpen={searchOpen}
          onClose={closeSearch}
          onInteraction={handleSearchInteraction}
        />
      </div>

      {/* Right: Upload button */}
      <button
        onClick={handleUploadClick}
        className="flex items-center justify-center w-11 h-11 text-cave-fog hover:text-cave-white transition-colors"
        aria-label="Upload flyer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Action modal */}
      <ActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
      />
    </header>
  );
}
