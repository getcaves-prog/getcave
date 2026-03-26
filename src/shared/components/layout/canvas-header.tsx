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
        minHeight: 56,
        paddingTop: "max(env(safe-area-inset-top), 0px)",
        backgroundColor: active ? "rgba(5, 5, 5, 0.55)" : "rgba(5, 5, 5, 0.25)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Left: Auth action */}
      {user ? (
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center w-11 h-11 text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Log out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
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

      {/* Center: Logo + Search zone */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        onMouseLeave={handleZoneMouseLeave}
      >
        <div className="flex flex-col items-center">
          <Image
            src="/Logo.png"
            alt="Caves"
            width={120}
            height={43}
            className="h-auto w-[120px] transition-opacity duration-300 cursor-pointer"
            style={{ opacity: hidelogo ? 0 : 1 }}
            onClick={() => { openSearch(); handleSearchInteraction(); }}
          />
          {locationName && (
            <button
              onClick={() => { openSearch(); handleSearchInteraction(); }}
              className="flex items-center gap-1 mt-0.5 cursor-pointer transition-colors hover:text-cave-white group"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-cave-white/70 group-hover:text-cave-white shrink-0"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
              <span className="text-[11px] text-cave-white/80 tracking-wide truncate max-w-[180px] font-[family-name:var(--font-space-mono)] group-hover:text-cave-white">
                {locationName}
              </span>
            </button>
          )}
        </div>

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
