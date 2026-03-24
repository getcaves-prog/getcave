import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0A0A0A] p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
