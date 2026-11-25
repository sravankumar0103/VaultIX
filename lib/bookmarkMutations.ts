import type { SupabaseClient } from "@supabase/supabase-js"
import type { Bookmark } from "@/types/bookmark"
import { MEDIA_BUCKET, buildMediaFileName, getMediaPathFromUrl } from "@/lib/mediaStorage"

export type DbClient = Pick<SupabaseClient, "from" | "storage">

export type NewBookmarkRow = {
  title: string
  url: string | null
  description: string
  user_id: string
  domain: string
  category: "URL" | "Media" | "Media+URL"
  priority: 1 | 2 | 3
  tags: string[]
}

export type BookmarkPatch = Omit<NewBookmarkRow, "user_id">

// Thrown when a write matched no row of this user (gone, or not theirs).
export class BookmarkNotChangedError extends Error {
  constructor() {
    super("The bookmark was not changed")
    this.name = "BookmarkNotChangedError"
  }
}

type Uploaded = { path: string; publicUrl: string }

async function uploadMedia(
  client: DbClient,
  title: string,
  file: File,
  ext: string | null
): Promise<Uploaded> {
  const path = buildMediaFileName(title, ext ?? "bin")
  const bucket = client.storage.from(MEDIA_BUCKET)
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  const { data } = bucket.getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

// Best effort: a failed cleanup must never hide the error that caused it.
async function removeObjectQuietly(client: DbClient, path: string): Promise<void> {
  try {
    const { error } = await client.storage.from(MEDIA_BUCKET).remove([path])
    if (error) console.error("Could not remove media object:", error)
  } catch (err) {
    console.error("Could not remove media object:", err)
  }
}

export async function createBookmarkRecord(
  client: DbClient,
  a: { row: NewBookmarkRow; file: File | null; ext: string | null }
): Promise<Bookmark> {
  const uploaded = a.file ? await uploadMedia(client, a.row.title, a.file, a.ext) : null
  try {
    const { data, error } = await client
      .from("bookmarks")
      .insert([{ ...a.row, media_url: uploaded ? uploaded.publicUrl : null }])
      .select()
      .single()
    if (error) throw error
    return data as Bookmark
  } catch (err) {
    if (uploaded) await removeObjectQuietly(client, uploaded.path)
    throw err
  }
}

export async function updateBookmarkRecord(
  client: DbClient,
  a: {
    id: string
    userId: string
    patch: BookmarkPatch
    oldMediaUrl: string | null
    file: File | null
    ext: string | null
  }
): Promise<{ mediaUrl: string | null }> {
  // 1. Upload the new object first: a failure here changes nothing.
  const uploaded = a.file ? await uploadMedia(client, a.patch.title, a.file, a.ext) : null
  const mediaUrl = uploaded ? uploaded.publicUrl : a.oldMediaUrl

  // 2. Update the row; on failure the old object is untouched and the new one is removed.
  try {
    const { data, error } = await client
      .from("bookmarks")
      .update({ ...a.patch, media_url: mediaUrl })
      .eq("id", a.id)
      .eq("user_id", a.userId)
      .select("id")
    if (error) throw error
    if (!data || data.length === 0) throw new BookmarkNotChangedError()
  } catch (err) {
    if (uploaded) await removeObjectQuietly(client, uploaded.path)
    throw err
  }

  // 3. Only now remove the replaced object. The edit has already succeeded, so a failure
  // here leaves an orphan file but never fails the edit.
  if (uploaded) {
    const oldPath = getMediaPathFromUrl(a.oldMediaUrl)
    if (oldPath) await removeObjectQuietly(client, oldPath)
  }

  return { mediaUrl }
}

export async function deleteBookmarkRecord(
  client: DbClient,
  a: { id: string; userId: string; mediaUrl: string | null }
): Promise<{ storageError: unknown | null }> {
  // Row first: if it fails the file is still there and the bookmark is intact.
  const { data, error } = await client
    .from("bookmarks")
    .delete()
    .eq("id", a.id)
    .eq("user_id", a.userId)
    .select("id")
  if (error) throw error
  if (!data || data.length === 0) throw new BookmarkNotChangedError()

  const path = getMediaPathFromUrl(a.mediaUrl)
  if (!path) return { storageError: null }
  try {
    const { error: storageError } = await client.storage.from(MEDIA_BUCKET).remove([path])
    return { storageError: storageError ?? null }
  } catch (err) {
    return { storageError: err }
  }
}

export async function setBookmarkArchived(
  client: DbClient,
  a: { id: string; userId: string; archived: boolean }
): Promise<void> {
  const { data, error } = await client
    .from("bookmarks")
    .update({ is_archived: a.archived })
    .eq("id", a.id)
    .eq("user_id", a.userId)
    .select("id")
  if (error) throw error
  if (!data || data.length === 0) throw new BookmarkNotChangedError()
}
