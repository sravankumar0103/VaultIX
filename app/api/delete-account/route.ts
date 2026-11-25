import { NextRequest, NextResponse } from "next/server"
import { sendAccountDeletedEmail } from "@/lib/accountEmails"
import { releaseRequestLock, tryAcquireRequestLock } from "@/lib/requestLocks"
import { getUserFromBearer } from "@/lib/server/auth"
import { jsonError } from "@/lib/server/http"
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin"

export const runtime = "nodejs"

const SKIP_DELETE_EMAIL_WEBHOOK_FLAG = "skip_account_deleted_email_webhook"

async function restoreDeleteWebhookFlag(userId: string, appMetadata: Record<string, unknown>) {
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, {
    app_metadata: appMetadata,
  })

  if (error) {
    console.error("Failed to roll back deletion email handling flag:", error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromBearer(req)
    if (!user) {
      return jsonError(401, "Unauthorized")
    }

    const supabaseAdmin = getSupabaseAdmin()
    const userId = user.id
    const userEmail = user.email!
    const userName =
      user.user_metadata?.full_name || user.user_metadata?.name || "Customer"
    const originalAppMetadata = (user.app_metadata ?? {}) as Record<string, unknown>
    const deleteLockKey = `delete-account:${userId}`

    if (!tryAcquireRequestLock(deleteLockKey, 60_000)) {
      return jsonError(409, "Account deletion already in progress")
    }

    try {
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          app_metadata: {
            ...originalAppMetadata,
            [SKIP_DELETE_EMAIL_WEBHOOK_FLAG]: true,
          },
        }
      )

      if (metadataError) {
        console.error("Failed to prepare deletion email handling:", metadataError)
        return jsonError(500, "Failed to prepare account deletion")
      }

      const { data: userBookmarks } = await supabaseAdmin
        .from("bookmarks")
        .select("media_url")
        .eq("user_id", userId)

      if (userBookmarks && userBookmarks.length > 0) {
        const storagePrefix = "/storage/v1/object/public/media/"
        const filePaths = userBookmarks
          .filter((bookmark) => bookmark.media_url)
          .map((bookmark) => {
            const url = bookmark.media_url
            const index = url.indexOf(storagePrefix)
            return index !== -1 ? url.slice(index + storagePrefix.length) : null
          })
          .filter(Boolean) as string[]

        if (filePaths.length > 0) {
          const { error: storageError } = await supabaseAdmin.storage
            .from("media")
            .remove(filePaths)

          if (storageError) {
            console.error("Storage cleanup error (non-fatal):", storageError)
          }
        }
      }

      const { error: complaintsError } = await supabaseAdmin
        .from("complaints")
        .delete()
        .eq("user_id", userId)

      if (complaintsError) {
        console.error("Complaints deletion error:", complaintsError)
        await restoreDeleteWebhookFlag(userId, originalAppMetadata)

        return jsonError(500, "Failed to purge user feedback data")
      }

      const { error: bookmarksError } = await supabaseAdmin
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)

      if (bookmarksError) {
        console.error("Bookmarks deletion error:", bookmarksError)
        await restoreDeleteWebhookFlag(userId, originalAppMetadata)

        return jsonError(500, "Failed to purge user bookmarks")
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error("Auth delete error:", deleteError)
        await restoreDeleteWebhookFlag(userId, originalAppMetadata)

        return jsonError(500, `Auth deletion failed: ${deleteError.message}`)
      }

      try {
        await sendAccountDeletedEmail({
          email: userEmail,
          name: userName,
        })
      } catch (emailError) {
        console.error("Farewell email failed (non-blocking):", emailError)
      }

      return NextResponse.json({ success: true })
    } finally {
      releaseRequestLock(deleteLockKey)
    }
  } catch (error) {
    console.error("Delete account error:", error)
    return jsonError(500, "Internal server error")
  }
}
