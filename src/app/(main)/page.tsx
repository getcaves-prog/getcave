import { FlyerFeed } from "@/features/feed/components/flyer-feed";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Caves — Discover what's happening around you",
  description: "Find events, parties, and things to do near you",
};

export default function FeedPage() {
  return <FlyerFeed />;
}
