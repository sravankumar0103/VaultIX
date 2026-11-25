"use client"

import { motion } from "framer-motion"
import type { CategoryFilter } from "@/lib/filterBookmarks"

type PriorityFilter = "All" | 1 | 2 | 3

type Props = {
  mode: string
  priorityFilter: PriorityFilter
  onPriorityChange: (value: PriorityFilter) => void
  categoryFilter: CategoryFilter
  onCategoryChange: (value: CategoryFilter) => void
}

const priorityOptions: (1 | 2 | 3)[] = [3, 2, 1]
const categoryOptions: CategoryFilter[] = ["All", "URL", "Media"]

export default function BookmarkSubFilters({
  mode,
  priorityFilter,
  onPriorityChange,
  categoryFilter,
  onCategoryChange,
}: Props) {
  return (
    <>
      {/* ===== PRIORITY SUB-FILTER ===== */}
      {mode === "priority" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-2 mb-2"
        >
          <span className="text-xs font-semibold text-themeMuted uppercase tracking-wider mr-2">Filter</span>
          <button
            onClick={() => onPriorityChange("All")}
            aria-pressed={priorityFilter === "All"}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${priorityFilter === "All"
              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
              : "bg-themeCard text-themeMuted hover:bg-white/5 border border-white/5"
              }`}
          >
            All
          </button>
          {priorityOptions.map((p) => (
            <button
              key={p}
              onClick={() => onPriorityChange(p)}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${priorityFilter === p
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                : "bg-themeCard text-themeMuted hover:bg-white/5 border border-white/5"
                }`}
              title={`${p} Stars`}
              aria-label={`Show ${p}-star bookmarks`}
              aria-pressed={priorityFilter === p}
            >
              {Array(p).fill("⭐").join("")}
            </button>
          ))}
        </motion.div>
      )}

      {/* ===== CATEGORY SUB-FILTER ===== */}
      {mode === "categories" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-2 mb-2"
        >
          <span className="text-xs font-semibold text-themeMuted uppercase tracking-wider mr-2">Filter</span>
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              aria-pressed={categoryFilter === cat}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${categoryFilter === cat
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                : "bg-themeCard text-themeMuted hover:bg-white/5 border border-white/5"
                }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>
      )}
    </>
  )
}
