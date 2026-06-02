"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { signUp, signInWithGoogle } from "@/features/auth/services/auth.service";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

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

    if (!username.trim()) {
      setError("Username is required.");
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

    if (!acceptedTerms) {
      setError("You need to accept the terms to continue.");
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await signUp({
        email,
        password,
        username,
      });

      if (signUpError) {
        setError(signUpError);
        return;
      }

      router.replace("/");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleError(error);
      setGoogleLoading(false);
    }
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

      {/* Google sign up */}
      <div className="flex w-full max-w-sm flex-col gap-3 mb-2">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={googleLoading}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-cave-ash bg-transparent text-sm text-cave-fog transition-colors hover:border-cave-white hover:text-cave-white disabled:opacity-50 font-[family-name:var(--font-inter)]"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>
        {googleError && (
          <p className="text-center text-xs text-red-500">{googleError}</p>
        )}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-cave-ash" />
          <span className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)]">or sign up with email</span>
          <div className="h-px flex-1 bg-cave-ash" />
        </div>
      </div>

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
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
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

        <div className="flex items-start gap-3 rounded-xl border border-cave-ash bg-cave-rock px-4 py-3 text-sm text-cave-fog font-[family-name:var(--font-inter)]">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-cave-ash bg-cave-black text-cave-white focus:ring-0"
          />
          <span>
            I agree to the{" "}
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="text-cave-white underline underline-offset-4 transition-colors hover:text-cave-light"
            >
              terms and conditions
            </button>
            .
          </span>
        </div>

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

      {termsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6"
          onClick={() => setTermsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-cave-ash bg-cave-black p-6 text-left shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sm tracking-[0.3em] text-cave-white uppercase font-[family-name:var(--font-space-mono)]">
                Terms
              </h2>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="text-cave-fog transition-colors hover:text-cave-white"
                aria-label="Close terms"
              >
                ×
              </button>
            </div>
            <p className="text-sm leading-6 text-cave-fog font-[family-name:var(--font-inter)]">
              Keep it clean. No illegal content, harassment, spam, impersonation,
              or abusive material. Respect other users, own what you upload, and
              use the app responsibly.
            </p>
            <Link
              href="/terms"
              className="mt-5 inline-flex text-xs tracking-widest text-cave-white underline underline-offset-4 uppercase transition-colors hover:text-cave-light font-[family-name:var(--font-space-mono)]"
            >
              Read full terms
            </Link>
          </div>
        </div>
      )}
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
