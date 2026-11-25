import { NextRequest, NextResponse } from "next/server"
import { sendAccountDeletedEmail } from "@/lib/accountEmails"
import { requireEnv } from "@/lib/env"
import { releaseRequestLock, tryAcquireRequestLock } from "@/lib/requestLocks"
import { secretsMatch } from "@/lib/server/auth"
import { isUuid, jsonError, readJsonObject } from "@/lib/server/http"
import { dropSharedMediaPaths, removeMediaObjects } from "@/lib/server/mediaCleanup"
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin"

export const runtime = "nodejs"

const INVALID_BODY = "Invalid request body."
const MAX_EMAIL_LENGTH = 320
const MAX_NAME_LENGTH = 200
const MAX_MEDIA_PATHS = 1000
// Same shape as getMediaPathFromUrl accepts: one or two plain name segments.
const MEDIA_PATH_PATTERN = /^[A-Za-z0-9._-]{1,200}(\/[A-Za-z0-9._-]{1,200})?$/

type DeletedAccountPayload = {
  email: string
  recipientName: string | null
  userId: string | null
  // null: the list was too long to trust, so no media is removed.
  mediaPaths: string[] | null
  skippedPaths: number
}

function isAbsent(value: unknown) {
  return value === undefined || value === null
}

function isOptionalName(value: unknown) {
  return isAbsent(value) || (typeof value === "string" && value.length <= MAX_NAME_LENGTH)
}

function isMediaPath(value: unknown): value is string {
  return typeof value === "string" && !value.includes("..") && MEDIA_PATH_PATTERN.test(value)
}

function parsePayload(body: Record<string, unknown>): DeletedAccountPayload | null {
  const { email, fullName, name, userId, mediaPaths } = body

  if (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH) return null
  const trimmedEmail = email.trim()
  if (!trimmedEmail.includes("@")) return null
  if (!isOptionalName(fullName) || !isOptionalName(name)) return null
  if (!isAbsent(userId) && !isUuid(userId)) return null
  if (!isAbsent(mediaPaths) && !Array.isArray(mediaPaths)) return null

  let paths: string[] | null = []
  let skippedPaths = 0

  if (Array.isArray(mediaPaths)) {
    if (mediaPaths.length > MAX_MEDIA_PATHS) {
      paths = null
      skippedPaths = mediaPaths.length
    } else {
      // An invalid name is skipped on its own, so one bad row never costs the email (R-3).
      const valid = new Set<string>()
      for (const path of mediaPaths) {
        if (isMediaPath(path)) {
          valid.add(path)
        } else {
          skippedPaths += 1
        }
      }
      paths = [...valid]
    }
  }

  const recipientName =
    (typeof fullName === "string" ? fullName.trim() : "") ||
    (typeof name === "string" ? name.trim() : "") ||
    null

  return {
    email: trimmedEmail,
    recipientName,
    userId: isUuid(userId) ? userId : null,
    mediaPaths: paths,
    skippedPaths,
  }
}

// Best effort: every failure is logged and keeps the files, and none stops the email.
async function removeDeletedUserMedia(payload: DeletedAccountPayload) {
  if (payload.skippedPaths > 0) {
    console.error(`Account deleted webhook skipped ${payload.skippedPaths} invalid or excess media path(s)`)
  }

  const paths = payload.mediaPaths
  if (!paths || paths.length === 0) return

  // Without the user id the check cannot leave out the deleted user's own rows, so it
  // cannot tell a shared object from an unshared one: keep them all.
  if (!payload.userId) {
    console.error(`Account deleted webhook kept ${paths.length} media object(s): no userId to check against`)
    return
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    // The trigger runs before the delete, but pg_net sends after commit, so the deleted
    // user's rows are gone by now and the check sees only other users' rows (R-4).
    const removable = await dropSharedMediaPaths(supabaseAdmin, payload.userId, paths)
    await removeMediaObjects(supabaseAdmin, removable)
  } catch (error: unknown) {
    console.error("Shared media check failed, keeping all media objects:", error)
  }
}

export async function POST(req: NextRequest) {
  try {
    let webhookSecret: string
    try {
      webhookSecret = requireEnv("ACCOUNT_DELETE_WEBHOOK_SECRET")
    } catch {
      console.error("Missing ACCOUNT_DELETE_WEBHOOK_SECRET for account delete webhook")
      return jsonError(500, "Account delete webhook is not configured")
    }

    if (!secretsMatch(req.headers.get("x-vaultix-webhook-secret"), webhookSecret)) {
      return jsonError(401, "Unauthorized")
    }

    const body = await readJsonObject(req)
    const payload = body ? parsePayload(body) : null
    if (!payload) {
      return jsonError(400, INVALID_BODY)
    }

    const lockKey = `account-deleted-webhook:${payload.userId ?? payload.email.toLowerCase()}`

    if (!tryAcquireRequestLock(lockKey, 300_000)) {
      return NextResponse.json({
        success: true,
        message: "Deletion email already in progress",
      })
    }

    try {
      await removeDeletedUserMedia(payload)

      try {
        await sendAccountDeletedEmail({
          email: payload.email,
          name: payload.recipientName,
        })
      } catch (error: unknown) {
        console.error("Account deleted webhook email failed:", error)
        return jsonError(500, "Failed to send deletion email")
      }

      return NextResponse.json({ success: true })
    } finally {
      releaseRequestLock(lockKey)
    }
  } catch (error: unknown) {
    console.error("Account deleted webhook error:", error)
    return jsonError(500, "Internal server error")
  }
}
