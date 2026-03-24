import { BottomNav } from "@/shared/components/layout/bottom-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0A0A0A]">
      {children}
      <BottomNav />
    </div>
  );
}
