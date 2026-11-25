import { NextRequest, NextResponse } from "next/server"

import { sendWelcomeEmail } from "@/lib/accountEmails"
import { releaseRequestLock, tryAcquireRequestLock } from "@/lib/requestLocks"
import { getUserFromBearer } from "@/lib/server/auth"
import { jsonError } from "@/lib/server/http"
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin"

export const runtime = "nodejs"

// user_metadata is user-editable, so a name can be any JSON value.
function nameFrom(value: unknown) {
  return typeof value === "string" ? value : ""
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromBearer(req)
    if (!user) {
      return jsonError(401, "Unauthorized")
    }

    // The flag lives in app_metadata (server-only). The old user_metadata flag still
    // counts, so accounts welcomed before the move get no second mail.
    if (user.app_metadata?.welcome_sent === true || user.user_metadata?.welcome_sent === true) {
      return NextResponse.json({ success: true, message: "Welcome email already sent" })
    }

    const userEmail = user.email
    if (!userEmail) {
      return NextResponse.json({ success: true, message: "Welcome email skipped" })
    }

    const welcomeLockKey = `welcome:${user.id}`
    if (!tryAcquireRequestLock(welcomeLockKey, 60_000)) {
      return NextResponse.json({ success: true, message: "Welcome email already in progress" })
    }

    try {
      const userName =
        nameFrom(user.user_metadata?.full_name) || nameFrom(user.user_metadata?.name) || "there"
      const admin = getSupabaseAdmin()

      // Set the flag before sending so a retry cannot send a second mail.
      const { error: flagError } = await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { welcome_sent: true },
      })

      if (flagError) {
        console.error("Failed to save the welcome flag:", flagError)
        return jsonError(500, "Internal server error")
      }

      try {
        await sendWelcomeEmail({ email: userEmail, name: userName })
      } catch (sendError) {
        console.error("Welcome email failed:", sendError)

        // Clear the flag (a null value removes the key) so the next sign-in retries.
        const { error: clearError } = await admin.auth.admin.updateUserById(user.id, {
          app_metadata: { welcome_sent: null },
        })

        if (clearError) {
          console.error("Failed to clear the welcome flag:", clearError)
        }

        return jsonError(500, "Internal server error")
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
