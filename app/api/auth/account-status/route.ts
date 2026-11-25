import { NextRequest, NextResponse } from "next/server"

import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { userId?: unknown } | null
    const userId = typeof body?.userId === "string" ? body.userId.trim() : ""

    if (!userId) {
      return NextResponse.json({ exists: false }, { status: 200 })
    }

    const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId)

    if (error || !data.user) {
      return NextResponse.json({ exists: false }, { status: 200 })
    }

    return NextResponse.json({ exists: true }, { status: 200 })
  } catch (error) {
    console.error("Account status lookup failed:", error)
    return NextResponse.json({ exists: true }, { status: 200 })
  }
}
