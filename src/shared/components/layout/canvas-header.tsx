"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import Link from "next/link";

export function CanvasHeader() {
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
          className="text-cave-fog text-xs font-[family-name:var(--font-space-mono)] tracking-wide uppercase hover:text-cave-white transition-colors"
        >
          Sign up
        </Link>
      )}

      {/* Center: Logo */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-5xl text-cave-white font-[family-name:var(--font-pinyon-script)]">
        Caves
      </h1>

      {/* Right: Upload button */}
      <button
        onClick={handleUploadClick}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-cave-white text-cave-black font-bold text-xl leading-none"
        aria-label="Upload flyer"
      >
        +
      </button>
    </header>
  );
}
