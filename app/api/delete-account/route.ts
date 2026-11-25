import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { sendAccountDeletedEmail } from "@/lib/accountEmails"
import { getMediaPathFromUrl, MEDIA_BUCKET } from "@/lib/mediaStorage"
import { releaseRequestLock, tryAcquireRequestLock } from "@/lib/requestLocks"
import { getUserFromBearer } from "@/lib/server/auth"
import { jsonError } from "@/lib/server/http"
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin"

export const runtime = "nodejs"

const SKIP_DELETE_EMAIL_WEBHOOK_FLAG = "skip_account_deleted_email_webhook"
const PAGE_SIZE = 1000
const STORAGE_CHUNK_SIZE = 100
const DELETION_FAILED = "Account deletion failed. Please try again."
const PREPARE_FAILED = "Failed to prepare account deletion"

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

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

// media_url is writable by the row's owner and object names are flat, so a user could
// point a bookmark at another user's object. Keep only the objects that no bookmark of
// any other user references (R-4). If the check fails, keep none: a leftover file is
// recoverable, a deleted one is not.
async function dropSharedMediaPaths(
  supabaseAdmin: SupabaseClient,
  userId: string,
  paths: string[]
): Promise<string[]> {
  const removable: string[] = []
  let skipped = 0

  for (const pathChunk of chunk(paths, STORAGE_CHUNK_SIZE)) {
    // Object names only hold [A-Za-z0-9._-/] (getMediaPathFromUrl), so they cannot break
    // out of the quoted filter value. "_" is a LIKE wildcard, which can only over-match
    // and so only skip more.
    const filter = pathChunk.map((path) => `media_url.like."%${path}%"`).join(",")
    const shared = new Set<string>()
    let checkFailed = false

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabaseAdmin
        .from("bookmarks")
        .select("media_url")
        .neq("user_id", userId)
        .or(filter)
        .order("id")
        .range(from, from + PAGE_SIZE - 1)

      if (error || !data) {
        console.error("Shared media check failed, keeping these objects:", error)
        checkFailed = true
        break
      }

      for (const row of data) {
        for (const path of pathChunk) {
          if (typeof row.media_url === "string" && row.media_url.includes(path)) {
            shared.add(path)
          }
        }
      }

      if (data.length < PAGE_SIZE) {
        break
      }
    }

    for (const path of pathChunk) {
      if (checkFailed || shared.has(path)) {
        skipped += 1
      } else {
        removable.push(path)
      }
    }
  }

  if (skipped > 0) {
    console.error(`Account deletion kept ${skipped} media object(s) referenced by other users or not checked`)
  }

  return removable
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

      // The account is gone from here on: cleanup failures are logged, never returned.
      try {
        const { error: bookmarksError } = await supabaseAdmin
          .from("bookmarks")
          .delete()
          .eq("user_id", userId)

        if (bookmarksError) {
          console.error("Bookmarks cleanup error (non-fatal):", bookmarksError)
        }

        const removablePaths = await dropSharedMediaPaths(supabaseAdmin, userId, mediaPaths)
        for (const pathChunk of chunk(removablePaths, STORAGE_CHUNK_SIZE)) {
          const { error: storageError } = await supabaseAdmin.storage
            .from(MEDIA_BUCKET)
            .remove(pathChunk)

          if (storageError) {
            console.error("Storage cleanup error (non-fatal):", storageError)
          }
        }
      } catch (cleanupError: unknown) {
        console.error("Post-deletion cleanup error (non-fatal):", cleanupError)
      }

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
