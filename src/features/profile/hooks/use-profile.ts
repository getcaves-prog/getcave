"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import type { Database } from "@/shared/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useProfile() {
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState({ profile: null, loading: false, error: null });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setState({
        profile: data,
        loading: false,
        error: error?.message ?? null,
      });
    }

    fetchProfile();
  }, []);

  return state;
}
