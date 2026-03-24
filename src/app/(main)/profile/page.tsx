import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfileWithEvents } from "@/features/profile/services/profile.service";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { UserEventsList } from "@/features/profile/components/user-events-list";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const profileData = await getProfileWithEvents();
  if (!profileData) redirect("/auth/login");

  return (
    <div className="min-h-dvh bg-[#0A0A0A] pb-24">
      <ProfileHeader profile={profileData} />
      <div className="px-4">
        <UserEventsList events={profileData.events} />
      </div>
    </div>
  );
}
