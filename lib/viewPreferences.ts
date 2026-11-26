export type ViewMode = "cards" | "list" | "headlines" | "moodboard"
export type SortMode = "date-desc" | "date-asc" | "name-asc" | "name-desc"

const VIEW_MODES: readonly string[] = ["cards", "list", "headlines", "moodboard"]
const SORT_MODES: readonly string[] = ["date-desc", "date-asc", "name-asc", "name-desc"]

export function isViewMode(v: unknown): v is ViewMode {
  return typeof v === "string" && VIEW_MODES.includes(v)
}

export function isSortMode(v: unknown): v is SortMode {
  return typeof v === "string" && SORT_MODES.includes(v)
}

export function parseStoredViewMode(v: unknown): ViewMode | null {
  if (v === "grid") return "cards"
  return isViewMode(v) ? v : null
}
