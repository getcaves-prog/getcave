"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { createClient } from "@/shared/lib/supabase/client";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
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

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center bg-cave-black px-6">
      {/* Logo */}
      <Image
        src="/Logo.png"
        alt="Caves"
        width={200}
        height={72}
        priority
        className="mt-[12dvh] mb-10 h-auto w-[200px]"
      />

      {/* Form */}
      <form
        onSubmit={handleSignup}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="h-12 w-full rounded-xl border border-cave-ash bg-cave-rock px-4 text-base text-cave-white placeholder:text-cave-fog focus:border-cave-white focus:outline-none font-[family-name:var(--font-inter)]"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="h-12 w-full rounded-xl border border-cave-ash bg-cave-rock px-4 text-base text-cave-white placeholder:text-cave-fog focus:border-cave-white focus:outline-none font-[family-name:var(--font-inter)]"
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="h-12 w-full rounded-xl border border-cave-ash bg-cave-rock px-4 text-base text-cave-white placeholder:text-cave-fog focus:border-cave-white focus:outline-none font-[family-name:var(--font-inter)]"
        />

        {error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-full bg-cave-white text-sm font-medium tracking-widest text-cave-black uppercase transition-colors hover:bg-cave-light disabled:opacity-50 font-[family-name:var(--font-space-mono)]"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex w-full max-w-sm items-center gap-4">
        <div className="h-px flex-1 bg-cave-ash" />
        <span className="text-xs tracking-widest text-cave-fog uppercase font-[family-name:var(--font-space-mono)]">
          or
        </span>
        <div className="h-px flex-1 bg-cave-ash" />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="flex h-12 w-full max-w-sm items-center justify-center gap-3 rounded-full border border-cave-ash bg-transparent text-sm font-medium tracking-widest text-cave-white uppercase transition-colors hover:border-cave-white font-[family-name:var(--font-space-mono)]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      {/* Login link */}
      <p className="mt-auto mb-[8dvh] text-sm text-cave-fog font-[family-name:var(--font-inter)]">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-cave-white underline underline-offset-4 transition-colors hover:text-cave-light"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
