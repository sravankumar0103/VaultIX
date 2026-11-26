import type { Bookmark } from "@/types/bookmark"
import type { SortMode } from "@/lib/viewPreferences"

export type BookmarkMode = "all" | "archived" | "categories" | "priority"
export type CategoryFilter = "All" | "URL" | "Media"

function matchesCategory(category: string | null | undefined, filter: CategoryFilter): boolean {
  if (filter === "All") return true
  return category === filter || category === "Media+URL"
}

export function filterBookmarks(
  list: Bookmark[],
  f: { mode: BookmarkMode; search: string; priority: "All" | 1 | 2 | 3; category: CategoryFilter }
): Bookmark[] {
  const query = f.search.toLowerCase()
  return list.filter((b) => {
    const matchesSearch =
      b.title?.toLowerCase().includes(query) ||
      b.domain?.toLowerCase().includes(query) ||
      b.category?.toLowerCase().includes(query) ||
      b.tags?.some((tag) => tag.toLowerCase().includes(query))

    let matchesMode = b.is_archived !== true
    if (f.mode === "archived") {
      matchesMode = b.is_archived === true
    } else if (f.mode === "priority") {
      if (f.priority !== "All") {
        matchesMode = (b.priority ?? 0) === Number(f.priority) && b.is_archived !== true
      } else {
        matchesMode = (b.priority ?? 0) >= 1 && b.is_archived !== true
      }
    } else if (f.priority !== "All") {
      matchesMode = (b.priority ?? 0) === Number(f.priority) && b.is_archived !== true
    }

    return Boolean(matchesSearch) && matchesCategory(b.category, f.category) && matchesMode
  })
}

function time(value: string | null | undefined): number {
  const t = value ? new Date(value).getTime() : 0
  return Number.isNaN(t) ? 0 : t
}

export function sortBookmarks(list: Bookmark[], sortBy: SortMode): Bookmark[] {
  return [...list].sort((a, b) => {
    if (sortBy === "date-desc") return time(b.created_at) - time(a.created_at)
    if (sortBy === "date-asc") return time(a.created_at) - time(b.created_at)
    const titleA = (a.title || "").toLowerCase()
    const titleB = (b.title || "").toLowerCase()
    if (sortBy === "name-asc") return titleA.localeCompare(titleB)
    if (sortBy === "name-desc") return titleB.localeCompare(titleA)
    return 0
  })
}
