import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/shared/types/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/shared/lib/supabase/env";

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  );
}
