import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/features/profile/services/profile.service";
import { EditProfileForm } from "@/features/profile/components/edit-profile-form";

export const metadata: Metadata = {
  title: "Edit Profile",
};

export default async function EditProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect("/auth/login");

  return (
    <div className="min-h-dvh bg-[#0A0A0A] pb-24">
      <header className="sticky top-0 z-40 border-b border-[#2A2A2A] bg-[#0A0A0A]/90 backdrop-blur-lg px-4 py-3">
        <h1 className="text-lg font-bold font-[family-name:var(--font-space-grotesk)]">
          Editar Perfil
        </h1>
      </header>
      <div className="mx-auto max-w-lg p-4">
        <EditProfileForm profile={profile} />
      </div>
    </div>
  );
}
