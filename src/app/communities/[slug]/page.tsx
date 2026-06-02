import { CommunityProfile } from "@/features/communities/components/community-profile";
import type { Metadata } from "next";

interface CommunityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} — Comunidad en Caves`,
  };
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  return <CommunityProfile slug={slug} />;
}
