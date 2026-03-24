import { FeedHeader } from "@/features/feed/components/feed-header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh bg-black">
      <FeedHeader />
      <main className="h-dvh">{children}</main>
    </div>
  );
}
