import { CreateCommunityForm } from "@/features/communities/components/create-community-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nueva comunidad — Caves",
};

export default function NewCommunityPage() {
  return <CreateCommunityForm />;
}
