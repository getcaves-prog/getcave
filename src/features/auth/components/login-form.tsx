"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";
import { signInWithGoogle } from "@/features/auth/services/auth.service";

type View = "landing" | "email";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      window.location.href = searchParams.get("redirectTo") ?? "/";
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToFeed = () => {
    window.location.href = "/";
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setGoogleLoading(false);
    }
    // On success: browser redirects to Google, no further action needed
  };

  // Landing view — logo + action buttons
  if (view === "landing") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-cave-black">
        <Image
          src="/Logo.png"
          alt="Caves"
          width={280}
          height={100}
          priority
          className="mb-auto mt-[30dvh] h-auto w-[280px]"
        />

        <div className="mb-[12dvh] flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setView("email")}
            className="w-[210px] rounded-full border border-transparent bg-cave-white px-6 py-3 text-sm font-medium tracking-widest text-cave-black uppercase transition-colors hover:bg-cave-light font-[family-name:var(--font-space-mono)]"
          >
            Log in.
          </button>

          <Link
            href="/auth/signup"
            className="w-[210px] rounded-full border border-cave-smoke bg-transparent px-6 py-3 text-center text-sm font-medium tracking-widest text-cave-fog uppercase transition-colors hover:border-cave-white hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Sign up.
          </Link>

          <div className="flex w-[210px] items-center gap-3 py-1">
            <div className="h-px flex-1 bg-cave-ash" />
            <span className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)]">or</span>
            <div className="h-px flex-1 bg-cave-ash" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex w-[210px] items-center justify-center gap-2.5 rounded-full border border-cave-ash bg-transparent px-6 py-3 text-sm text-cave-fog transition-colors hover:border-cave-white hover:text-cave-white disabled:opacity-50 font-[family-name:var(--font-inter)]"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>
        </div>
      </div>
    );
  }

  // Email login view — form with inputs
  return (
    <div className="flex min-h-dvh flex-col items-center bg-cave-black px-6">
      <Image
        src="/Logo.png"
        alt="Caves"
        width={200}
        height={72}
        priority
        className="mt-[12dvh] mb-10 h-auto w-[200px]"
      />

      <form onSubmit={handleEmailLogin} className="flex w-full max-w-sm flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="h-12 w-full rounded-xl border border-cave-ash bg-cave-rock px-4 text-base text-cave-white placeholder:text-cave-fog focus:border-cave-white focus:outline-none font-[family-name:var(--font-inter)]"
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-12 w-full rounded-xl border border-cave-ash bg-cave-rock px-4 pr-12 text-base text-cave-white placeholder:text-cave-fog focus:border-cave-white focus:outline-none font-[family-name:var(--font-inter)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cave-fog transition-colors hover:text-cave-white"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.484 4.484l2.829 2.829M6.343 6.343l11.314 11.314M14.121 14.121A3 3 0 009.879 9.879" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-full bg-cave-white text-sm font-medium tracking-widest text-cave-black uppercase transition-colors hover:bg-cave-light disabled:opacity-50 font-[family-name:var(--font-space-mono)]"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleBackToFeed}
        className="mt-3 text-sm tracking-widest text-cave-fog uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
      >
        Back to feed
      </button>

      <div className="mt-auto mb-[8dvh] flex flex-col items-center gap-2">
        <p className="text-sm text-cave-fog font-[family-name:var(--font-inter)]">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-cave-white underline underline-offset-4 transition-colors hover:text-cave-light">
            Sign up
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setView("landing")}
          className="text-xs text-cave-fog transition-colors hover:text-cave-white"
        >
          Back
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
