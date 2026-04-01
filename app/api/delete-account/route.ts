import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { sendAccountDeletedEmail } from "@/lib/accountEmails"
import { releaseRequestLock, tryAcquireRequestLock } from "@/lib/requestLocks"

const SKIP_DELETE_EMAIL_WEBHOOK_FLAG = "skip_account_deleted_email_webhook"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function restoreDeleteWebhookFlag(userId: string, appMetadata: Record<string, unknown>) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: appMetadata,
  })

  if (error) {
    console.error("Failed to roll back deletion email handling flag:", error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = user.id
    const userEmail = user.email!
    const userName =
      user.user_metadata?.full_name || user.user_metadata?.name || "Customer"
    const originalAppMetadata = (user.app_metadata ?? {}) as Record<string, unknown>
    const deleteLockKey = `delete-account:${userId}`

    if (!tryAcquireRequestLock(deleteLockKey, 60_000)) {
      return NextResponse.json(
        { error: "Account deletion already in progress" },
        { status: 409 }
      )
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
        return NextResponse.json(
          { error: "Failed to prepare account deletion" },
          { status: 500 }
        )
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

        return NextResponse.json(
          { error: "Failed to purge user feedback data" },
          { status: 500 }
        )
      }

      const { error: bookmarksError } = await supabaseAdmin
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)

      if (bookmarksError) {
        console.error("Bookmarks deletion error:", bookmarksError)
        await restoreDeleteWebhookFlag(userId, originalAppMetadata)

        return NextResponse.json(
          { error: "Failed to purge user bookmarks" },
          { status: 500 }
        )
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error("Auth delete error:", deleteError)
        await restoreDeleteWebhookFlag(userId, originalAppMetadata)

        return NextResponse.json(
          { error: `Auth deletion failed: ${deleteError.message}` },
          { status: 500 }
        )
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
