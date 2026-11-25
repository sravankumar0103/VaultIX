import { NextRequest, NextResponse } from "next/server"

import { sendWelcomeEmail } from "@/lib/accountEmails"
import { releaseRequestLock, tryAcquireRequestLock } from "@/lib/requestLocks"
import { getUserFromBearer } from "@/lib/server/auth"
import { jsonError } from "@/lib/server/http"
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromBearer(req)
    if (!user) {
      return jsonError(401, "Unauthorized")
    }

    // Check if welcome email was already sent
    if (user.user_metadata?.welcome_sent) {
      return NextResponse.json({ success: true, message: "Welcome email already sent" })
    }

    const welcomeLockKey = `welcome:${user.id}`
    if (!tryAcquireRequestLock(welcomeLockKey, 60_000)) {
      return NextResponse.json({ success: true, message: "Welcome email already in progress" })
    }

    try {
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || "there"
      const userEmail = user.email!

      await sendWelcomeEmail({ email: userEmail, name: userName })

      // Mark as sent in user metadata
      const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, welcome_sent: true }
      })

      if (updateError) {
        console.error("Failed to update user metadata:", updateError)
      }

      return NextResponse.json({ success: true, message: "Welcome email sent" })
    } finally {
      releaseRequestLock(welcomeLockKey)
    }
  } catch (err) {
    console.error("Welcome API error:", err)
    return jsonError(500, "Internal server error")
  }
}
