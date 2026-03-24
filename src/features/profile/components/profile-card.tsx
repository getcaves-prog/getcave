import Image from "next/image";
import { Card } from "@/shared/components/ui/card";
import type { Database } from "@/shared/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface ProfileCardProps {
  profile: Profile;
}

function getInitials(username: string): string {
  return username
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#2A2A2A]">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.username}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-bold text-[#A0A0A0]">
            {getInitials(profile.username)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold font-[family-name:var(--font-space-grotesk)]">
          {profile.username}
        </p>
        <span className="inline-block rounded-full bg-[#2A2A2A] px-2.5 py-0.5 text-xs capitalize text-[#A0A0A0]">
          {profile.role}
        </span>
        {profile.bio && (
          <p className="mt-1 line-clamp-2 text-sm text-[#A0A0A0]">
            {profile.bio}
          </p>
        )}
      </div>
    </Card>
  );
}
