"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import type { User } from "@supabase/supabase-js"
import {
  LayoutGrid,
  List,
  AlignJustify,
  LayoutDashboard,
  Sun,
  Moon,
  ArrowUpDown,
  Plus,
  Search,
  Settings2,
} from "lucide-react"
import type { Theme } from "@/lib/themePreferences"
import type { SortMode, ViewMode } from "@/lib/viewPreferences"

type Props = {
  headerTitle: string
  user: User | null
  search: string
  onSearchChange: (value: string) => void
  sortBy: SortMode
  onSortChange: (value: SortMode) => void
  viewMode: ViewMode
  onViewModeChange: (value: ViewMode) => void
  theme: Theme
  onToggleTheme: () => void
  onNewBookmark: () => void
}

const sortOptions: { id: SortMode; label: string }[] = [
  { id: "date-desc", label: "Newest first" },
  { id: "date-asc", label: "Oldest first" },
  { id: "name-asc", label: "Name (A-Z)" },
  { id: "name-desc", label: "Name (Z-A)" },
]

const viewOptions: { id: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { id: "cards", icon: LayoutGrid, label: "Cards" },
  { id: "list", icon: List, label: "Detailed List" },
  { id: "headlines", icon: AlignJustify, label: "Headlines" },
  { id: "moodboard", icon: LayoutDashboard, label: "Moodboard" },
]

export default function BookmarkToolbar({
  headerTitle,
  user,
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  theme,
  onToggleTheme,
  onNewBookmark,
}: Props) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)

  const viewRef = useRef<HTMLDivElement | null>(null)
  const sortRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (viewRef.current && !viewRef.current.contains(target)) {
        setIsViewOpen(false)
      }
      if (sortRef.current && !sortRef.current.contains(target)) {
        setIsSortOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDownOutside)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside)
    }
  }, [])

  const greetingName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there"

  const toggleSort = () => {
    setIsSortOpen((open) => !open)
    setIsViewOpen(false)
  }

  const toggleView = () => {
    setIsViewOpen((open) => !open)
    setIsSortOpen(false)
  }

  return (
    <>
      {/* ===== HEADER SECTION ===== */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between pt-4">
        <div className="max-w-[calc(100vw-48px)]">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col">
            <h2 className="text-sm md:text-lg font-medium text-themeMuted mb-1 truncate">
              Hey, {greetingName}.
            </h2>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-themeText mb-2">
              {headerTitle}
            </h1>
          </motion.div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewBookmark}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-purple-500/25 border border-purple-400/20"
          >
            <Plus size={18} />
            <span>New Bookmark</span>
          </motion.button>
        </div>
      </div>

      {/* ===== CONTROLS ROW ===== */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-2 rounded-2xl glass mb-4 relative z-20">

        {/* Search */}
        <div className="relative w-full sm:w-96 group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-themeMuted group-focus-within:text-purple-500 transition-colors">
            <Search size={18} />
          </div>
          <input
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-themeCard border border-white/10 text-themeText placeholder:text-themeMuted/70 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
            aria-label="Search bookmarks"
            placeholder="Search by title, domain, tags..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* View & Sort */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-y-visible pb-1 sm:pb-0 justify-center sm:justify-start">
          <div ref={sortRef} className="relative">
            <button
              onClick={toggleSort}
              aria-haspopup="menu"
              aria-expanded={isSortOpen}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-themeText text-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <ArrowUpDown size={16} className="text-themeMuted" />
              <span>Sort</span>
            </button>

            {isSortOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 bg-themeCard border border-white/10 rounded-xl shadow-2xl p-1.5 z-[100]">
                {sortOptions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { onSortChange(s.id); setIsSortOpen(false) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${sortBy === s.id ? 'bg-purple-500/10 text-purple-500 font-medium' : 'text-themeText hover:bg-white/10'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={viewRef} className="relative">
            <button
              onClick={toggleView}
              aria-haspopup="menu"
              aria-expanded={isViewOpen}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-themeText text-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Settings2 size={16} className="text-themeMuted" />
              <span>View</span>
            </button>

            {isViewOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-2 w-48 bg-themeCard border border-white/10 rounded-xl shadow-2xl p-1.5 z-[100]">
                {viewOptions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { onViewModeChange(v.id); setIsViewOpen(false) }}
                    className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${viewMode === v.id ? 'bg-purple-500/10 text-purple-500 font-medium' : 'text-themeText hover:bg-white/10'}`}
                  >
                    <v.icon size={16} className={viewMode === v.id ? "text-purple-500" : "text-themeMuted"} />
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block"></div>

          <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-themeMuted hover:text-purple-500 transition-all active:scale-95"
            title="Toggle Theme"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </>
  )
}
