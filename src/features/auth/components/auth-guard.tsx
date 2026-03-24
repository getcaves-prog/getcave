import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import type { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
}

export async function AuthGuard({ children }: AuthGuardProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <>{children}</>;
}
