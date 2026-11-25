import { NextRequest, NextResponse } from "next/server"
import { sendAccountDeletedEmail } from "@/lib/accountEmails"
import { releaseRequestLock, tryAcquireRequestLock } from "@/lib/requestLocks"
import { secretsMatch } from "@/lib/server/auth"
import { jsonError } from "@/lib/server/http"

export const runtime = "nodejs"

type DeletedAccountPayload = {
  email?: string
  fullName?: string | null
  name?: string | null
  userId?: string
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.ACCOUNT_DELETE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("Missing ACCOUNT_DELETE_WEBHOOK_SECRET for account delete webhook")
    return jsonError(500, "Account delete webhook is not configured")
  }

  if (!secretsMatch(req.headers.get("x-vaultix-webhook-secret"), webhookSecret)) {
    return jsonError(401, "Unauthorized")
  }

  let payload: DeletedAccountPayload

  try {
    payload = await req.json()
  } catch {
    return jsonError(400, "Invalid JSON payload")
  }

  const email = payload.email?.trim()
  if (!email) {
    return jsonError(400, "Email is required")
  }

  const recipientName = payload.fullName?.trim() || payload.name?.trim() || null
  const lockKey = `account-deleted-webhook:${payload.userId ?? email.toLowerCase()}`

  if (!tryAcquireRequestLock(lockKey, 300_000)) {
    return NextResponse.json({
      success: true,
      message: "Deletion email already in progress",
    })
  }

  try {
    await sendAccountDeletedEmail({
      email,
      name: recipientName,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Account deleted webhook email failed:", error)
    return jsonError(500, "Failed to send deletion email")
  } finally {
    releaseRequestLock(lockKey)
  }
}
