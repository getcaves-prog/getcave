import type { ReactNode } from "react";

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function MobileLayout({ children, showNav = true }: MobileLayoutProps) {
  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-white">
      <main className={showNav ? "pb-20" : ""}>{children}</main>
    </div>
  );
}
