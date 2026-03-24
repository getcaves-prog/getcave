import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { SignOutButton } from "@/features/profile/components/sign-out-button";
import type { ProfileWithEvents } from "@/features/profile/types/profile.types";

interface ProfileHeaderProps {
  profile: ProfileWithEvents;
}

function getInitials(username: string): string {
  return username
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <header className="border-b border-[#2A2A2A] px-4 pb-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold font-[family-name:var(--font-space-grotesk)]">
          Mi Perfil
        </h1>
        <SignOutButton />
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-[#2A2A2A]">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#A0A0A0]">
              {getInitials(profile.username)}
            </span>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold font-[family-name:var(--font-space-grotesk)]">
            {profile.username}
          </h2>
          <span className="mt-1 inline-block rounded-full bg-[#2A2A2A] px-3 py-0.5 text-xs capitalize text-[#A0A0A0]">
            {profile.role}
          </span>
        </div>

        {profile.bio && (
          <p className="max-w-xs text-center text-sm text-[#A0A0A0]">
            {profile.bio}
          </p>
        )}

        {profile.city && (
          <p className="text-xs text-[#666]">📍 {profile.city}</p>
        )}

        <Link href="/profile/edit" className="mt-2 w-full max-w-xs">
          <Button variant="secondary" className="w-full">
            Editar perfil
          </Button>
        </Link>
      </div>
    </header>
  );
}
