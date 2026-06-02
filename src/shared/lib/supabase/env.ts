export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_CAVESAPP_SUPABASE_URL ?? "";
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_CAVESAPP_SUPABASE_PUBLISHABLE_KEY ?? "";
}

export function getSupabaseServiceRoleKey() {
  return process.env.CAVESAPP_SUPABASE_SERVICE_ROLE_KEY ?? "";
}
