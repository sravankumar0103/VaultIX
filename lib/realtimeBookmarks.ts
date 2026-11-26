import type { Bookmark } from "@/types/bookmark"

export type RealtimeBookmarkChange = {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new: Partial<Bookmark>
  old: Partial<Bookmark>
}

// Pure reducer for Realtime events. `prev` only ever holds this user's rows, so rows of anyone
// else are dropped here even if the channel filter were ever bypassed.
export function applyRealtimeChange(
  prev: Bookmark[],
  change: RealtimeBookmarkChange,
  userId: string
): Bookmark[] {
  if (change.eventType === "DELETE") {
    const id = change.old.id
    // A DELETE payload usually carries only the primary key, so a user_id is checked only when present.
    if (change.old.user_id !== undefined && change.old.user_id !== userId) return prev
    if (!id || !prev.some((b) => b.id === id)) return prev
    return prev.filter((b) => b.id !== id)
  }

  const record = change.new
  if (!record.id || record.user_id !== userId) return prev
  const incoming = record as Bookmark

  if (change.eventType === "UPDATE") {
    if (!prev.some((b) => b.id === incoming.id)) return prev
    return prev.map((b) => (b.id === incoming.id ? incoming : b))
  }

  // INSERT: already have it (our own optimistic replacement ran first)
  if (prev.some((b) => b.id === incoming.id)) return prev

  // Replace a temporary optimistic row with the same title and url instead of duplicating it
  const optimisticMatch = prev.find(
    (b) => b.id.startsWith("opt-") && b.title === incoming.title && b.url === incoming.url
  )
  if (optimisticMatch) {
    return prev.map((b) => (b.id === optimisticMatch.id ? incoming : b))
  }

  return [incoming, ...prev]
}
