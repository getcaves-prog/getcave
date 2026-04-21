"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { signUp } from "@/features/auth/services/auth.service";

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
