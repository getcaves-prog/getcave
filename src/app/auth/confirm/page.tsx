"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

export default function AuthConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;

    if (!tokenHash || !type) {
      router.replace("/auth/login?error=confirmation_failed");
      return;
    }

    const supabase = createClient();
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) {
        router.replace("/auth/login?error=confirmation_failed");
      } else {
        router.replace("/");
      }
    });
  }, [router, searchParams]);

  return (
    <div className="flex h-dvh items-center justify-center bg-cave-black">
      <p className="animate-pulse font-[family-name:var(--font-space-mono)] text-sm text-cave-fog">
        Confirming...
      </p>
    </div>
  );
}
