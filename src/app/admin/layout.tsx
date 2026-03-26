"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/");
      return;
    }

    // For now, just check auth. When roles are set up, check role='admin'
    setReady(true);
  }, [user, loading, router]);

  if (loading || !ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-cave-black">
        <p className="font-[family-name:var(--font-space-mono)] text-sm text-cave-fog animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-cave-black">
      <AdminSidebar />
      <main className="flex-1 px-4 pt-16 pb-6 md:ml-60 md:px-8 md:pt-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}
