import { NextRequest, NextResponse } from "next/server"

import { sendFeedbackEmail } from "@/lib/accountEmails"
import { getUserFromBearer } from "@/lib/server/auth"
import { jsonError, readJsonObject } from "@/lib/server/http"
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin"

export const runtime = "nodejs"

const SUBJECT_MAX_LENGTH = 200
const BODY_MAX_LENGTH = 5000
const MAX_REPORTS_PER_HOUR = 5
const ONE_HOUR_MS = 60 * 60 * 1000

function readTrimmed(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length >= 1 && trimmed.length <= maxLength ? trimmed : null
}

function readMetadataName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromBearer(req)
    if (!user) {
      return jsonError(401, "Unauthorized")
    }

    const payload = await readJsonObject(req)
    if (!payload) {
      return jsonError(400, "Invalid request body.")
    }

    const subject = readTrimmed(payload.subject, SUBJECT_MAX_LENGTH)
    if (!subject) {
      return jsonError(400, "Subject must be 1 to 200 characters.")
    }

    const body = readTrimmed(payload.body, BODY_MAX_LENGTH)
    if (!body) {
      return jsonError(400, "Message must be 1 to 5000 characters.")
    }

    const supabaseAdmin = getSupabaseAdmin()
    const since = new Date(Date.now() - ONE_HOUR_MS).toISOString()

    const { count, error: countError } = await supabaseAdmin
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since)

    if (countError) {
      console.error("Failed to count recent feedback reports:", countError)
      return jsonError(500, "Internal server error")
    }

    if ((count ?? 0) >= MAX_REPORTS_PER_HOUR) {
      return jsonError(429, "Too many reports in the last hour. Please try again later.")
    }

    // user_id and user_email come from the verified token, status from the column default.
    const { error: insertError } = await supabaseAdmin.from("complaints").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      subject,
      body,
    })

    if (insertError) {
      console.error("Failed to store feedback report:", insertError)
      return jsonError(500, "Internal server error")
    }

    // The report is stored, so a mail problem must not fail the request.
    try {
      const to = process.env.FEEDBACK_TO_EMAIL
      if (!to) {
        console.error("FEEDBACK_TO_EMAIL is not set; feedback email skipped")
      } else {
        const email = user.email ?? ""
        await sendFeedbackEmail({
          to,
          replyTo: email,
          userName:
            readMetadataName(user.user_metadata?.full_name) ??
            readMetadataName(user.user_metadata?.name) ??
            (email.split("@")[0] || "Customer"),
          userEmail: email,
          subject,
          body,
        })
      }
    } catch (mailError: unknown) {
      console.error("Feedback email failed:", mailError)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error("Email API error:", err)
    return jsonError(500, "Internal server error")
  }
}
