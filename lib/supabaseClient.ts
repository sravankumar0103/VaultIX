import { createClient } from "@supabase/supabase-js"
import { requireValue } from "@/lib/env"

// Literal `process.env.NEXT_PUBLIC_*` reads: Next.js inlines only literal property reads into
// client bundles. PKCE keeps the code verifier in localStorage under this client's storage key,
// so this must stay the only browser client.
export const supabase = createClient(
  requireValue(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
  requireValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  { auth: { flowType: "pkce" } }
)
