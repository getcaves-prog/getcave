"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { signOut as authSignOut } from "@/features/auth/services/auth.service";
import type { AuthState, User } from "@/features/auth/types/auth.types";

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setState((prev) => ({ ...prev, user, loading: false }));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await authSignOut();
  };

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signOut,
  };
}
