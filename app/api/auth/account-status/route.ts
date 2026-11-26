import { NextRequest, NextResponse } from "next/server"

import { isUuid, readJsonObject } from "@/lib/server/http"
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin"

export const runtime = "nodejs"

// Only a positive "no such user" answer counts as missing. Any other failure answers
// `true`, so a Supabase outage never signs a real user out as "deleted".
function isUserNotFound(error: { status?: number; code?: string }) {
  return error.status === 404 || error.code === "user_not_found"
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonObject(req)
    const userId = typeof body?.userId === "string" ? body.userId.trim() : ""

    if (!isUuid(userId)) {
      return NextResponse.json({ exists: false }, { status: 200 })
    }

    const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId)

    if (error) {
      if (isUserNotFound(error)) {
        return NextResponse.json({ exists: false }, { status: 200 })
      }

      console.error("Account status lookup failed:", error)
      return NextResponse.json({ exists: true }, { status: 200 })
    }

    return NextResponse.json({ exists: Boolean(data.user) }, { status: 200 })
  } catch (error) {
    console.error("Account status lookup failed:", error)
    return NextResponse.json({ exists: true }, { status: 200 })
  }
}
