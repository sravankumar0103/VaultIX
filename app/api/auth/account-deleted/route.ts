import { NextRequest, NextResponse } from "next/server"
import { sendAccountDeletedEmail } from "@/lib/accountEmails"
import { releaseRequestLock, tryAcquireRequestLock } from "@/lib/requestLocks"

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
    return NextResponse.json(
      { error: "Account delete webhook is not configured" },
      { status: 500 }
    )
  }

  if (req.headers.get("x-vaultix-webhook-secret") !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: DeletedAccountPayload

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const email = payload.email?.trim()
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
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
    return NextResponse.json(
      { error: "Failed to send deletion email" },
      { status: 500 }
    )
  } finally {
    releaseRequestLock(lockKey)
  }
}
