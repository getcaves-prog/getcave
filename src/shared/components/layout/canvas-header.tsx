"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { createClient } from "@/shared/lib/supabase/client";
import Link from "next/link";
import { LocationSearch } from "@/shared/components/layout/location-search";
import { ActionModal } from "@/shared/components/layout/action-modal";
import { useLocationStore } from "@/shared/stores/location.store";

interface CanvasHeaderProps {
  hidelogo?: boolean;
}

export function CanvasHeader({ hidelogo }: CanvasHeaderProps) {
  const { user } = useAuth();
  const locationName = useLocationStore((s) => s.locationName);
  const [searchOpen, setSearchOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [active, setActive] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleUploadClick = () => {
    if (!user) {
      window.location.href = "/auth/signup";
      return;
    }
    setActionModalOpen(true);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  const openSearch = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setSearchOpen(true);
    setActive(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setLocked(false);
    setActive(false);
  }, []);

  const handleZoneMouseLeave = useCallback(() => {
    if (locked) return;
    closeTimeoutRef.current = setTimeout(() => {
      setSearchOpen(false);
      setActive(false);
    }, 300);
  }, [locked]);

  const handleSearchInteraction = useCallback(() => {
    setLocked(true);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 backdrop-blur-md safe-area-top transition-colors duration-300"
      style={{
        minHeight: 48,
        paddingTop: "max(env(safe-area-inset-top), 4px)",
        backgroundColor: active ? "rgba(5, 5, 5, 0.55)" : "rgba(5, 5, 5, 0.25)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Left: Auth + Location */}
      <div className="flex items-center gap-1">
        {user ? (
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
            aria-label="Log out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
            aria-label="Sign up"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </Link>
        )}
        {locationName && (
          <button
            onClick={() => { openSearch(); handleSearchInteraction(); }}
            className="flex items-center gap-1 cursor-pointer transition-colors hover:text-cave-white group"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cave-fog group-hover:text-cave-white shrink-0"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-[10px] text-cave-fog tracking-wide truncate max-w-[100px] font-[family-name:var(--font-space-mono)] group-hover:text-cave-white">
              {locationName}
            </span>
          </button>
        )}
      </div>

      {/* Center: Logo + Search zone */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        onMouseLeave={handleZoneMouseLeave}
      >
        <Image
          src="/Logo.png"
          alt="Caves"
          width={100}
          height={36}
          className="h-auto w-[100px] transition-opacity duration-300 cursor-pointer"
          style={{ opacity: hidelogo ? 0 : 1 }}
          onClick={() => { openSearch(); handleSearchInteraction(); }}
        />

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

      <ActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
      />
    </header>
  );
}
