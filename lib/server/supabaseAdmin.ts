import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { requireEnv } from "@/lib/env"

const globalForSupabaseAdmin = globalThis as typeof globalThis & {
  __vaultixSupabaseAdmin?: SupabaseClient
}

// Service-role client: bypasses Row Level Security. Server only, and scope every
// query by the verified user id.
export function getSupabaseAdmin(): SupabaseClient {
  if (!globalForSupabaseAdmin.__vaultixSupabaseAdmin) {
    globalForSupabaseAdmin.__vaultixSupabaseAdmin = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }

  return globalForSupabaseAdmin.__vaultixSupabaseAdmin
}
