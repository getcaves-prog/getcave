import { notFound } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { FlyerOverlayPage } from "@/features/canvas/components/flyer-overlay-page";
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
  if (!result) return { title: "Flyer Not Found" };

  const { flyer, creator } = result;
  const title = flyer.title || "Event on Caves";
  const creatorText = creator ? `Shared by @${creator.username}` : "Discover events near you";
  const locationText = flyer.address ? ` · ${flyer.address}` : "";
  const description = `${creatorText}${locationText} — Caves`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Caves",
      images: [
        {
          url: `/api/og/${id}`,
          width: 600,
          height: 900,
          alt: title,
          type: "image/png",
        },
      ],
      type: "article",
      ...(creator && { authors: [`@${creator.username}`] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: `/api/og/${id}`,
          alt: title,
        },
      ],
      creator: creator ? `@${creator.username}` : undefined,
    },
    other: {
      // WhatsApp specific — ensures large image preview
      "og:image:width": "1080",
      "og:image:height": "1350",
    },
  };
}

export default async function FlyerPage({ params }: FlyerPageProps) {
  const { id } = await params;
  const result = await getFlyer(id);
  if (!result) notFound();

  return <FlyerOverlayPage flyer={result.flyer as Record<string, unknown>} />;
}
