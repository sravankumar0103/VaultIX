import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = typeof body?.userId === "string" ? body.userId.trim() : ""

    if (!userId) {
      return NextResponse.json({ exists: false }, { status: 200 })
    }

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error || !data.user) {
      return NextResponse.json({ exists: false }, { status: 200 })
    }

    return NextResponse.json({ exists: true }, { status: 200 })
  } catch (error) {
    console.error("Account status lookup failed:", error)
    return NextResponse.json({ exists: true }, { status: 200 })
  }
}
