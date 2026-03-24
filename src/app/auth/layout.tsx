import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0A0A0A] px-6 relative overflow-hidden">
      {/* Subtle accent glow behind content */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[#FF4D4D]/8 blur-[120px]" />

      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
