import { NextRequest, NextResponse } from "next/server"

import { sendFeedbackEmail } from "@/lib/accountEmails"
import { jsonError } from "@/lib/server/http"

export const runtime = "nodejs"

function asText(value: unknown) {
  return typeof value === "string" ? value : ""
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as Record<string, unknown> | null
    const userEmail = asText(payload?.userEmail)

    await sendFeedbackEmail({
      to: "sravankumar0103@gmail.com",
      replyTo: userEmail,
      userName: asText(payload?.userName),
      userEmail,
      subject: asText(payload?.subject),
      body: asText(payload?.body),
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error("Email API error:", err)
    return jsonError(500, "Internal server error")
  }
}
