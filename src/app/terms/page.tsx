import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Caves",
  description: "Minimal terms and conditions for Caves.",
};

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-cave-black px-6 py-16 text-cave-white">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <div>
          <p className="mb-3 text-xs tracking-[0.35em] text-cave-fog uppercase font-[family-name:var(--font-space-mono)]">
            Terms & Conditions
          </p>
          <h1 className="text-3xl font-[family-name:var(--font-space-mono)]">
            Keep it clean.
          </h1>
        </div>

        <div className="space-y-5 text-sm leading-7 text-cave-fog font-[family-name:var(--font-inter)]">
          <p>No illegal content, hate speech, harassment, or spam.</p>
          <p>Do not impersonate people or publish content you do not own.</p>
          <p>Use the app responsibly and respect the community.</p>
          <p>
            We can limit or remove access if content breaks these rules.
          </p>
        </div>

        <Link
          href="/auth/signup"
          className="text-xs tracking-widest text-cave-white underline underline-offset-4 uppercase transition-colors hover:text-cave-light font-[family-name:var(--font-space-mono)]"
        >
          Back to signup
        </Link>
      </div>
    </main>
  );
}
