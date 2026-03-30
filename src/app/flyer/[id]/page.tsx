import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import type { Metadata } from "next";

interface FlyerPageProps {
  params: Promise<{ id: string }>;
}

async function getFlyer(id: string) {
  const supabase = await createClient();

  const { data: flyer } = await supabase
    .from("flyers")
    .select("*")
    .eq("id", id)
    .single();

  if (!flyer) return null;

  // Fetch creator if available
  let creator: { username: string; avatar_url: string | null } | null = null;
  if (flyer.user_id) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", flyer.user_id)
      .single();
    creator = data;
  }

  return { flyer, creator };
}

export async function generateMetadata({ params }: FlyerPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getFlyer(id);

  if (!result) {
    return { title: "Flyer Not Found" };
  }

  const { flyer, creator } = result;
  const title = flyer.title || "Event on Caves";
  const description = flyer.address
    ? `${title} at ${flyer.address} — Discover events near you on Caves`
    : `${title} — Discover events near you on Caves`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: flyer.image_url, width: 700, height: 1000 }],
      type: "article",
      ...(creator && { authors: [`@${creator.username}`] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [flyer.image_url],
    },
  };
}

export default async function FlyerPage({ params }: FlyerPageProps) {
  const { id } = await params;
  const result = await getFlyer(id);

  if (!result) {
    notFound();
  }

  const { flyer, creator } = result;

  return (
    <div className="min-h-dvh bg-cave-black flex flex-col items-center">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full flex items-center justify-center px-4 py-3 bg-cave-black/80 backdrop-blur-md safe-area-top">
        <Link href="/" className="font-[family-name:var(--font-pinyon-script)] text-2xl text-cave-white">
          Caves
        </Link>
      </header>

      {/* Flyer content */}
      <main className="flex-1 flex flex-col items-center w-full max-w-[480px] px-4 py-6">
        {/* Flyer image */}
        <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: "7 / 10" }}>
          <Image
            src={flyer.image_url}
            alt={flyer.title ?? "Event flyer"}
            fill
            sizes="480px"
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        {/* Flyer info */}
        <div className="w-full mt-4 space-y-3">
          {flyer.title && (
            <h1 className="text-lg text-cave-white font-medium font-[family-name:var(--font-space-mono)]">
              {flyer.title}
            </h1>
          )}

          {flyer.address && (
            <p className="text-sm text-cave-fog flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {flyer.address}
            </p>
          )}

          {/* Creator */}
          {creator && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-cave-stone border border-cave-ash shrink-0">
                {creator.avatar_url ? (
                  <Image
                    src={creator.avatar_url}
                    alt={creator.username}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-cave-smoke"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
              <span className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                @{creator.username}
              </span>
            </div>
          )}

          {/* Expiry info */}
          {flyer.expires_at && (
            <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
              Expires {new Date(flyer.expires_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* CTA button */}
        <Link
          href="/"
          className="mt-8 w-full min-h-[48px] flex items-center justify-center rounded-full bg-cave-white text-cave-black font-[family-name:var(--font-space-mono)] text-sm font-bold transition-opacity hover:opacity-80"
        >
          Open in Caves
        </Link>

        <p className="mt-3 text-xs text-cave-smoke text-center font-[family-name:var(--font-space-mono)]">
          Discover events happening around you
        </p>
      </main>
    </div>
  );
}
