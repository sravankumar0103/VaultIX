import { createHash, timingSafeEqual } from "node:crypto"
import type { User } from "@supabase/supabase-js"

import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin"

const BEARER_PREFIX = "Bearer "

export async function getUserFromBearer(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("Authorization")

  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    return null
  }

  const token = authHeader.slice(BEARER_PREFIX.length)
  const {
    data: { user },
    error,
  } = await getSupabaseAdmin().auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest()
}

// Hashing both sides gives equal-length buffers, so the compare is constant time
// whatever the lengths of the inputs.
export function secretsMatch(provided: string | null, expected: string): boolean {
  if (provided === null) {
    return false
  }

  return timingSafeEqual(sha256(provided), sha256(expected))
}
