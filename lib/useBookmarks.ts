"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"
import { runIX, priorityFromImportance } from "@/lib/ixEngine"
import { categoryFor, type ValidBookmarkInput } from "@/lib/bookmarkInput"
import {
  BookmarkNotChangedError,
  createBookmarkRecord,
  deleteBookmarkRecord,
  setBookmarkArchived,
  updateBookmarkRecord,
  type BookmarkPatch,
} from "@/lib/bookmarkMutations"
import { applyRealtimeChange } from "@/lib/realtimeBookmarks"
import type { Bookmark } from "@/types/bookmark"

export type MutationResult = { ok: true; message: string } | { ok: false; message: string }

const COLUMNS =
  "id,user_id,title,url,description,domain,category,priority,media_url,tags,is_archived,created_at,updated_at"

const NOT_CHANGED_MESSAGE = "That bookmark could not be changed. Refresh and try again."

const ok = (message: string): MutationResult => ({ ok: true, message })
const fail = (message: string): MutationResult => ({ ok: false, message })

function failureFor(err: unknown, fallback: string): MutationResult {
  return fail(err instanceof BookmarkNotChangedError ? NOT_CHANGED_MESSAGE : fallback)
}

// A channel topic only needs to be unique per mount; it is not a security token, and
// crypto.randomUUID() does not exist outside secure contexts.
function uniqueTopicSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function isPendingId(id: string): boolean {
  return id.startsWith("opt-")
}

function priorityFor(values: ValidBookmarkInput, importance: Parameters<typeof priorityFromImportance>[0]) {
  return values.priority === "Auto" ? priorityFromImportance(importance) : values.priority
}

function revokeBlobUrl(url: string | null | undefined) {
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url)
}

type LoadResult = { data: Bookmark[]; error: null } | { data: null; error: unknown }

async function fetchUserBookmarks(userId: string): Promise<LoadResult> {
  try {
    const { data, error } = await supabase
      .from("bookmarks")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) return { data: null, error }
    return { data: (data ?? []) as Bookmark[], error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export function useBookmarks(user: User) {
  // Depend on the id, never the User object: a token refresh hands out a new object.
  const userId = user.id
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // The latest list, so a handler can save a copy of the row it is about to change.
  const bookmarksRef = useRef<Bookmark[]>([])
  useEffect(() => {
    bookmarksRef.current = bookmarks
  }, [bookmarks])

  // Drops the answer of an older fetch when a newer one (or a user change) started after it.
  const fetchSeq = useRef(0)

  // Fetches the user's rows and applies the answer only if no newer fetch started meanwhile.
  // It does not touch the loading flags before the request, so the first load can run from an
  // effect (`isLoading` starts true); `reload` resets them first.
  const loadBookmarks = useCallback(() => {
    const seq = ++fetchSeq.current
    return fetchUserBookmarks(userId).then((result) => {
      if (seq !== fetchSeq.current) return
      if (result.data) {
        setBookmarks(result.data)
      } else {
        console.error("Error fetching bookmarks:", result.error)
        setLoadError(true)
      }
      setIsLoading(false)
    })
  }, [userId])

  const reload = useCallback(async () => {
    setIsLoading(true)
    setLoadError(false)
    await loadBookmarks()
  }, [loadBookmarks])

  useEffect(() => {
    const seqRef = fetchSeq
    void loadBookmarks()

    // A unique topic per mount: realtime-js reuses a channel that is still leaving under the
    // same topic, and subscribe() on a channel that is not closed does nothing.
    const channel = supabase
      .channel(`bookmarks-realtime-${userId}-${uniqueTopicSuffix()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookmarks", filter: `user_id=eq.${userId}` },
        (payload) => {
          setBookmarks((prev) =>
            applyRealtimeChange(
              prev,
              { eventType: payload.eventType, new: payload.new, old: payload.old },
              userId
            )
          )
        }
      )
      .subscribe()

    return () => {
      seqRef.current++
      void supabase.removeChannel(channel)
    }
  }, [userId, loadBookmarks])

  const addBookmark = useCallback(
    async (values: ValidBookmarkInput, file: File | null, ext: string | null): Promise<MutationResult> => {
      const failure = fail("Failed to create bookmark")

      const ix = runIX(values.url ?? "", values.title)
      const priority = priorityFor(values, ix.importance)
      const category = categoryFor(Boolean(file), Boolean(values.url))
      const optimisticId = `opt-${Date.now()}`
      const previewUrl = file ? URL.createObjectURL(file) : null

      const optimistic: Bookmark = {
        id: optimisticId,
        user_id: userId,
        title: values.title,
        url: values.url,
        description: values.description,
        domain: ix.domain,
        category,
        media_url: previewUrl,
        priority,
        tags: ix.tags,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: null,
      }
      setBookmarks((prev) => [optimistic, ...prev])

      try {
        const created = await createBookmarkRecord(supabase, {
          row: {
            title: values.title,
            url: values.url,
            description: values.description,
            user_id: userId,
            domain: ix.domain,
            category,
            priority,
            tags: ix.tags,
          },
          file,
          ext,
        })
        // Swap in the real row unless Realtime already did
        setBookmarks((prev) => prev.map((b) => (b.id === optimisticId ? created : b)))
        return ok("Bookmark created successfully")
      } catch (err) {
        console.error("Add failed:", err)
        setBookmarks((prev) => prev.filter((b) => b.id !== optimisticId))
        return failure
      } finally {
        revokeBlobUrl(previewUrl)
      }
    },
    [userId]
  )

  const updateBookmark = useCallback(
    async (
      id: string,
      values: ValidBookmarkInput,
      file: File | null,
      ext: string | null
    ): Promise<MutationResult> => {
      const failureMessage = "Update failed — rolling back"
      if (isPendingId(id)) return fail(failureMessage)
      // The row as it is now, not as it was when the edit modal opened.
      const current = bookmarksRef.current.find((b) => b.id === id)
      if (!current) return fail(NOT_CHANGED_MESSAGE)
      const saved: Bookmark = { ...current }
      const ix = runIX(values.url ?? "", values.title)
      const patch: BookmarkPatch = {
        title: values.title,
        url: values.url,
        description: values.description,
        domain: ix.domain,
        category: categoryFor(Boolean(file) || Boolean(saved.media_url), Boolean(values.url)),
        priority: priorityFor(values, ix.importance),
        tags: ix.tags,
      }

      setBookmarks((prev) => prev.map((b) => (b.id === saved.id ? { ...b, ...patch } : b)))

      try {
        const { mediaUrl } = await updateBookmarkRecord(supabase, {
          id: saved.id,
          userId,
          patch,
          oldMediaUrl: saved.media_url ?? null,
          file,
          ext,
        })
        setBookmarks((prev) => prev.map((b) => (b.id === saved.id ? { ...b, media_url: mediaUrl } : b)))
        return ok("Bookmark updated")
      } catch (err) {
        console.error("Update failed:", err)
        setBookmarks((prev) => prev.map((b) => (b.id === saved.id ? saved : b)))
        return failureFor(err, failureMessage)
      }
    },
    [userId]
  )

  const deleteBookmark = useCallback(
    async (id: string): Promise<MutationResult> => {
      const failureMessage = "Delete failed — rolling back"
      if (isPendingId(id)) return fail(failureMessage)
      const saved = bookmarksRef.current.find((b) => b.id === id)
      if (!saved) return fail(NOT_CHANGED_MESSAGE)
      const savedCopy: Bookmark = { ...saved }

      setBookmarks((prev) => prev.filter((b) => b.id !== id))

      try {
        const { storageError } = await deleteBookmarkRecord(supabase, {
          id,
          userId,
          mediaUrl: savedCopy.media_url ?? null,
        })
        if (storageError) {
          console.error("Bookmark deleted but its file could not be removed:", storageError)
          return ok("Bookmark deleted, but its file could not be removed from storage.")
        }
        return ok("Bookmark deleted")
      } catch (err) {
        console.error("Delete failed:", err)
        setBookmarks((prev) => (prev.some((b) => b.id === id) ? prev : [savedCopy, ...prev]))
        return failureFor(err, failureMessage)
      }
    },
    [userId]
  )

  const setArchived = useCallback(
    async (id: string, archived: boolean): Promise<MutationResult> => {
      const failureMessage = archived ? "Archive failed" : "Unarchive failed"
      if (isPendingId(id)) return fail(failureMessage)
      const saved = bookmarksRef.current.find((b) => b.id === id)
      if (!saved) return fail(NOT_CHANGED_MESSAGE)
      const savedCopy: Bookmark = { ...saved }

      setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, is_archived: archived } : b)))

      try {
        await setBookmarkArchived(supabase, { id, userId, archived })
        return ok(archived ? "Bookmark archived" : "Bookmark restored")
      } catch (err) {
        console.error(archived ? "Archive failed:" : "Unarchive failed:", err)
        setBookmarks((prev) => prev.map((b) => (b.id === id ? savedCopy : b)))
        return failureFor(err, failureMessage)
      }
    },
    [userId]
  )

  const archiveBookmark = useCallback((id: string) => setArchived(id, true), [setArchived])
  const unarchiveBookmark = useCallback((id: string) => setArchived(id, false), [setArchived])

  return {
    bookmarks,
    isLoading,
    loadError,
    reload,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    archiveBookmark,
    unarchiveBookmark,
    isPendingId,
  }
}
