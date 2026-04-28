import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database.types";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/shared/lib/supabase/env";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey()
  );
}
