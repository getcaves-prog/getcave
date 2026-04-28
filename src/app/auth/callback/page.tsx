"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? searchParams.get("redirectTo") ?? "/";

    if (!code) {
      router.replace("/auth/login?error=auth_failed");
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace("/auth/login?error=auth_failed");
      } else {
        router.replace(next);
      }
    });
  }, [router, searchParams]);

  return (
    <div className="flex h-dvh items-center justify-center bg-cave-black">
      <p className="animate-pulse font-[family-name:var(--font-space-mono)] text-sm text-cave-fog">
        Authenticating...
      </p>
    </div>
  );
}
