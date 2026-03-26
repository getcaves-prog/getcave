"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import Link from "next/link";

interface CanvasHeaderProps {
  hidelogo?: boolean;
}

export function CanvasHeader({ hidelogo }: CanvasHeaderProps) {
  const { user, signOut } = useAuth();

  const handleUploadClick = () => {
    alert("Coming soon");
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 backdrop-blur-md"
      style={{
        height: 56,
        backgroundColor: "rgba(5, 5, 5, 0.6)",
      }}
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
          className="flex items-center justify-center w-8 h-8 text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Sign up"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </Link>
      )}

      {/* Center: Logo */}
      <h1
        className="absolute left-1/2 -translate-x-1/2 text-5xl text-cave-white font-[family-name:var(--font-pinyon-script)] transition-opacity duration-300"
        style={{ opacity: hidelogo ? 0 : 1 }}
      >
        Caves
      </h1>

      {/* Right: Upload button */}
      <button
        onClick={handleUploadClick}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-cave-white text-cave-black font-bold text-sm leading-none"
        aria-label="Upload flyer"
      >
        +
      </button>
    </header>
  );
}
