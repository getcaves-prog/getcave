"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/client";

export function TermsConsentGate() {
  const [needsConsent, setNeedsConsent] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data } = await supabase
        .from("terms_acceptances")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) setNeedsConsent(true);
    });
  }, []);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setAccepting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("terms_acceptances")
      .insert({ user_id: user.id, terms_version: "1.0" });

    if (insertError) {
      setError("Could not save your acceptance. Please try again.");
      setAccepting(false);
      return;
    }

    setNeedsConsent(false);
  };

  if (!needsConsent) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
      {/* Backdrop — non-dismissible */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.92)",
          WebkitBackdropFilter: "blur(40px)",
          backdropFilter: "blur(40px)",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-cave-ash bg-cave-black p-7 shadow-2xl">
        {/* Header */}
        <div className="mb-1 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-cave-white" />
          <span className="font-[family-name:var(--font-space-mono)] text-[10px] tracking-[0.3em] text-cave-smoke uppercase">
            Required
          </span>
        </div>

        <h2 className="mb-4 font-[family-name:var(--font-space-mono)] text-lg font-bold text-cave-white">
          Terms &amp; Conditions
        </h2>

        <p className="mb-5 text-sm leading-6 text-cave-fog font-[family-name:var(--font-inter)]">
          Before continuing, you need to accept our terms and conditions. Keep it clean — no illegal content, harassment, spam, or abusive material. Respect other users and use the app responsibly.
        </p>

        <div className="mb-6 flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href="/terms"
            target="_blank"
            className="inline-flex text-xs tracking-widest text-cave-white underline underline-offset-4 uppercase transition-colors hover:text-cave-light font-[family-name:var(--font-space-mono)]"
          >
            Términos →
          </Link>
          <Link
            href="/organizer"
            target="_blank"
            className="inline-flex text-xs tracking-widest text-cave-fog underline underline-offset-4 uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Organizadores →
          </Link>
          <Link
            href="/content-policy"
            target="_blank"
            className="inline-flex text-xs tracking-widest text-cave-fog underline underline-offset-4 uppercase transition-colors hover:text-cave-white font-[family-name:var(--font-space-mono)]"
          >
            Política →
          </Link>
        </div>

        {error && (
          <p className="mb-4 text-center text-xs text-red-400 font-[family-name:var(--font-space-mono)]">
            {error}
          </p>
        )}

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="h-12 w-full rounded-full bg-cave-white text-sm font-medium tracking-widest text-cave-black uppercase transition-colors hover:bg-cave-light disabled:opacity-50 font-[family-name:var(--font-space-mono)]"
        >
          {accepting ? "Saving…" : "I accept the terms"}
        </button>
      </div>
    </div>
  );
}
