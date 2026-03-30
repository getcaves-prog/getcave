import { ProfilePage } from "@/features/profile/components/profile-page";

interface ProfileRouteProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfileRouteProps) {
  const { username } = await params;
  return {
    title: `@${username}`,
  };
}

export default async function ProfileRoute({ params }: ProfileRouteProps) {
  const { username } = await params;
  return <ProfilePage username={username} />;
}
