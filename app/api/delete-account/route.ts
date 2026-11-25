import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { sendAccountDeletedEmail } from "@/lib/accountEmails"
import { getMediaPathFromUrl } from "@/lib/mediaStorage"
import { releaseRequestLock, tryAcquireRequestLock } from "@/lib/requestLocks"
import { getUserFromBearer } from "@/lib/server/auth"
import { jsonError } from "@/lib/server/http"
import { dropSharedMediaPaths, removeMediaObjects } from "@/lib/server/mediaCleanup"
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin"

export const runtime = "nodejs"

const SKIP_DELETE_EMAIL_WEBHOOK_FLAG = "skip_account_deleted_email_webhook"
const PAGE_SIZE = 1000
const DELETION_FAILED = "Account deletion failed. Please try again."
const PREPARE_FAILED = "Failed to prepare account deletion"

// Supabase Auth merges app_metadata keys on update, and null removes the key (P20).
async function clearDeleteWebhookFlag(userId: string) {
  try {
    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, {
      app_metadata: { [SKIP_DELETE_EMAIL_WEBHOOK_FLAG]: null },
    })

    if (error) {
      console.error("Failed to roll back deletion email handling flag:", error)
    }
  } catch (error: unknown) {
    console.error("Failed to roll back deletion email handling flag:", error)
  }
}

// Reads every media object name on the user's bookmarks, page by page. Returns null
// when a page cannot be read, so the caller can stop before deleting anything.
async function readUserMediaPaths(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<string[] | null> {
  const paths = new Set<string>()

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("bookmarks")
      .select("media_url")
      .eq("user_id", userId)
      .order("id")
      .range(from, from + PAGE_SIZE - 1)

    if (error || !data) {
      console.error("Failed to read media paths for account deletion:", error)
      return null
    }

    for (const row of data) {
      const path = getMediaPathFromUrl(row.media_url)
      if (path) {
        paths.add(path)
      }
    }

    if (data.length < PAGE_SIZE) {
      return [...paths]
    }
  }
}

export async function POST(req: NextRequest) {
  // Set once the skip flag is on and cleared once the auth user is gone, so the outer
  // catch knows whether a rollback is still needed.
  let flaggedUserId: string | null = null

  try {
    const user = await getUserFromBearer(req)
    if (!user) {
      return jsonError(401, "Unauthorized")
    }

    const supabaseAdmin = getSupabaseAdmin()
    const userId = user.id
    const userEmail = user.email
    const userName =
      user.user_metadata?.full_name || user.user_metadata?.name || "Customer"
    const deleteLockKey = `delete-account:${userId}`

    if (!tryAcquireRequestLock(deleteLockKey, 60_000)) {
      return jsonError(409, "Account deletion already in progress")
    }

    try {
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          app_metadata: {
            ...user.app_metadata,
            [SKIP_DELETE_EMAIL_WEBHOOK_FLAG]: true,
          },
        }
      )

      if (metadataError) {
        console.error("Failed to prepare deletion email handling:", metadataError)
        return jsonError(500, PREPARE_FAILED)
      }

      flaggedUserId = userId

      // Collected before anything is deleted: once the auth user is gone the rows may
      // already be gone too (FK cascade).
      const mediaPaths = await readUserMediaPaths(supabaseAdmin, userId)
      if (!mediaPaths) {
        await clearDeleteWebhookFlag(userId)
        flaggedUserId = null
        return jsonError(500, PREPARE_FAILED)
      }

      const { error: complaintsError } = await supabaseAdmin
        .from("complaints")
        .delete()
        .eq("user_id", userId)

      if (complaintsError) {
        console.error("Complaints deletion error:", complaintsError)
        await clearDeleteWebhookFlag(userId)
        flaggedUserId = null
        return jsonError(500, DELETION_FAILED)
      }

      // The auth user goes before bookmarks and media, so a failure here loses no data.
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error("Auth delete error:", deleteError)
        await clearDeleteWebhookFlag(userId)
        flaggedUserId = null
        return jsonError(500, DELETION_FAILED)
      }

      flaggedUserId = null

      // The account is gone from here on: each cleanup step logs its own failure, and
      // none of them is returned or stops the next step.
      try {
        const { error: bookmarksError } = await supabaseAdmin
          .from("bookmarks")
          .delete()
          .eq("user_id", userId)

        if (bookmarksError) {
          console.error("Bookmarks cleanup error (non-fatal):", bookmarksError)
        }
      } catch (bookmarksError: unknown) {
        console.error("Bookmarks cleanup error (non-fatal):", bookmarksError)
      }

      let removablePaths: string[] = []
      try {
        removablePaths = await dropSharedMediaPaths(supabaseAdmin, userId, mediaPaths)
      } catch (checkError: unknown) {
        console.error("Shared media check failed, keeping all media objects:", checkError)
      }

      await removeMediaObjects(supabaseAdmin, removablePaths)

      if (userEmail) {
        try {
          await sendAccountDeletedEmail({
            email: userEmail,
            name: userName,
          })
        } catch (emailError: unknown) {
          console.error("Farewell email failed (non-blocking):", emailError)
        }
      }

      return NextResponse.json({ success: true })
    } finally {
      releaseRequestLock(deleteLockKey)
    }
  } catch (error: unknown) {
    console.error("Delete account error:", error)
    if (flaggedUserId) {
      await clearDeleteWebhookFlag(flaggedUserId)
    }
    return jsonError(500, "Internal server error")
  }
}
