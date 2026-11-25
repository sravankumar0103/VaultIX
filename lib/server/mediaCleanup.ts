import type { SupabaseClient } from "@supabase/supabase-js"

import { MEDIA_BUCKET } from "@/lib/mediaStorage"

const PAGE_SIZE = 1000
const STORAGE_CHUNK_SIZE = 100
// The reference check sends its names in a GET URL, so keep each filter well under the
// ~8 KB request-line limit of common proxies.
const REFERENCE_CHECK_MAX_NAMES = 20
const REFERENCE_CHECK_MAX_FILTER_LENGTH = 3000

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

// Object names only hold [A-Za-z0-9._-/] (getMediaPathFromUrl), so they cannot break
// out of the quoted filter value. "_" is a LIKE wildcard, which can only over-match
// and so only skip more.
function referenceCondition(path: string) {
  return `media_url.like."%${path}%"`
}

// Batches names for the reference check by count and by joined filter length.
function referenceBatches(paths: string[]): string[][] {
  const batches: string[][] = []
  let current: string[] = []
  let length = 0

  for (const path of paths) {
    // +1 for the comma that joins it to the previous condition.
    const conditionLength = referenceCondition(path).length + 1
    if (
      current.length > 0 &&
      (current.length >= REFERENCE_CHECK_MAX_NAMES ||
        length + conditionLength > REFERENCE_CHECK_MAX_FILTER_LENGTH)
    ) {
      batches.push(current)
      current = []
      length = 0
    }
    length += conditionLength
    current.push(path)
  }

  if (current.length > 0) {
    batches.push(current)
  }

  return batches
}

// media_url is writable by the row's owner and object names are flat, so a user could
// point a bookmark at another user's object. Keep only the objects that no bookmark of
// any other user references (R-4). If the check fails, keep none: a leftover file is
// recoverable, a deleted one is not. Callers pass only names that already match the
// media path pattern.
export async function dropSharedMediaPaths(
  supabaseAdmin: SupabaseClient,
  userId: string,
  paths: string[]
): Promise<string[]> {
  const removable: string[] = []
  let skipped = 0

  for (const pathChunk of referenceBatches(paths)) {
    const filter = pathChunk.map(referenceCondition).join(",")
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

// Removes objects from the media bucket in chunks of 100. Each chunk logs its own
// failure and never stops the next one.
export async function removeMediaObjects(supabaseAdmin: SupabaseClient, paths: string[]) {
  for (const pathChunk of chunk(paths, STORAGE_CHUNK_SIZE)) {
    try {
      const { error: storageError } = await supabaseAdmin.storage
        .from(MEDIA_BUCKET)
        .remove(pathChunk)

      if (storageError) {
        console.error("Storage cleanup error (non-fatal):", storageError)
      }
    } catch (storageError: unknown) {
      console.error("Storage cleanup error (non-fatal):", storageError)
    }
  }
}
