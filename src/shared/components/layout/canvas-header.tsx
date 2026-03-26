"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { SlideMenu } from "@/shared/components/layout/slide-menu";

export function CanvasHeader() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleUploadClick = () => {
    alert("Coming soon");
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 backdrop-blur-md"
        style={{
          height: 56,
          backgroundColor: "rgba(5, 5, 5, 0.6)",
        }}
      >
        {/* Left: Hamburger */}
        <button
          onClick={openMenu}
          className="flex items-center justify-center w-10 h-10 text-cave-white"
          aria-label="Open menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Center: Logo */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-5xl text-cave-white font-[family-name:var(--font-pinyon-script)]">
          Caves
        </h1>

        {/* Right: Upload button (auth only) */}
        {user ? (
          <button
            onClick={handleUploadClick}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-cave-white text-cave-black font-bold text-xl leading-none"
            aria-label="Upload flyer"
          >
            +
          </button>
        ) : (
          <div className="w-10 h-10" aria-hidden="true" />
        )}
      </header>

      <SlideMenu
        isOpen={menuOpen}
        onClose={closeMenu}
        user={user}
        onSignOut={signOut}
      />
    </>
  );
}
