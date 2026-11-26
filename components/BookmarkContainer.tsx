"use client"

import { useCallback, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import BookmarkCard from "@/components/BookmarkCard"
import type { Bookmark } from "@/types/bookmark"
import Toast from "@/components/Toast"
import { Folder } from "lucide-react"
import { useTheme } from "@/app/ThemeContext"
import { motion, AnimatePresence } from "framer-motion"
import LoadingLogo from "@/components/LoadingLogo"
import { useToast } from "@/lib/useToast"
import { useDashboardUser } from "@/components/DashboardUserContext"
import { isPendingId, useBookmarks } from "@/lib/useBookmarks"
import { validateBookmarkSubmission, type BookmarkFormValues } from "@/lib/bookmarkInput"
import {
  filterBookmarks,
  sortBookmarks,
  type BookmarkMode,
  type CategoryFilter,
} from "@/lib/filterBookmarks"
import {
  isSortMode,
  isViewMode,
  parseStoredViewMode,
  type SortMode,
  type ViewMode,
} from "@/lib/viewPreferences"
import BookmarkToolbar from "@/components/bookmarks/BookmarkToolbar"
import BookmarkSubFilters from "@/components/bookmarks/BookmarkSubFilters"
import BookmarkFormModal from "@/components/bookmarks/BookmarkFormModal"
import DeleteConfirmModal from "@/components/bookmarks/DeleteConfirmModal"

const EMPTY_FORM: BookmarkFormValues = {
  title: "",
  url: "",
  description: "",
  priority: "Auto",
}

const VIEW_MODE_KEY = "vaultix-view-mode"
const SORT_MODE_KEY = "vaultix-sort-mode"

// localStorage throws when storage is blocked (Safari private mode); treat that as "nothing stored".
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

// The old "grid" value always wins; otherwise the account preference beats the local one,
// and anything that is not a known mode is ignored.
function resolveViewMode(stored: string | null, accountValue: unknown): ViewMode | null {
  if (stored === "grid") return "cards"
  if (isViewMode(accountValue)) return accountValue
  return parseStoredViewMode(stored)
}

function resolveSortMode(stored: string | null, accountValue: unknown): SortMode | null {
  if (isSortMode(accountValue)) return accountValue
  return isSortMode(stored) ? stored : null
}

export default function BookmarkContainer({
  mode = "all",
}: {
  mode?: BookmarkMode
}) {
  /* =========================
     State
  ========================= */
  const user = useDashboardUser()
  const {
    bookmarks,
    isLoading,
    loadError,
    reload,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    archiveBookmark,
    unarchiveBookmark,
  } = useBookmarks(user)

  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<"All" | 1 | 2 | 3>("All")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All")

  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const [isAddOpen, setIsAddOpen] = useState(false)

  const { toast, showToast, hideToast } = useToast()

  // Read once on mount (this component only mounts in the browser, after the layout verified
  // the session). Later token refreshes must not reset a view the user just picked.
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => resolveViewMode(readStored(VIEW_MODE_KEY), user.user_metadata?.view_preference) ?? "cards"
  )
  const [sortBy, setSortBy] = useState<SortMode>(
    () => resolveSortMode(readStored(SORT_MODE_KEY), user.user_metadata?.sort_preference) ?? "date-desc"
  )

  const { theme, toggleTheme } = useTheme()

  /* =========================
     Preferences
  ========================= */
  const updateViewMode = useCallback(
    async (v: ViewMode) => {
      setViewMode(v)
      localStorage.setItem(VIEW_MODE_KEY, v)
      try {
        const { error } = await supabase.auth.updateUser({
          data: { view_preference: v },
        })
        if (error) console.error("Failed to sync view preference:", error)
      } catch (err) {
        console.error("Failed to sync view preference:", err)
      }
    },
    []
  )

  const updateSortBy = useCallback(
    async (s: SortMode) => {
      setSortBy(s)
      localStorage.setItem(SORT_MODE_KEY, s)
      try {
        const { error } = await supabase.auth.updateUser({
          data: { sort_preference: s },
        })
        if (error) console.error("Failed to sync sort preference:", error)
      } catch (err) {
        console.error("Failed to sync sort preference:", err)
      }
    },
    []
  )

  /* =========================
     Actions
  ========================= */
  const handleAdd = useCallback(
    (values: BookmarkFormValues, file: File | null) => {
      const checked = validateBookmarkSubmission(values, file, { existingMedia: false })
      if (!checked.ok) {
        showToast(checked.message, "error")
        return
      }
      setIsAddOpen(false)
      void addBookmark(checked.value, file, checked.ext).then((result) =>
        showToast(result.message, result.ok ? "success" : "error")
      )
    },
    [addBookmark, showToast]
  )

  const handleEdit = useCallback(
    (values: BookmarkFormValues, file: File | null) => {
      if (!editingBookmark) return
      const checked = validateBookmarkSubmission(values, file, {
        existingMedia: Boolean(editingBookmark.media_url),
      })
      if (!checked.ok) {
        showToast(checked.message, "error")
        return
      }
      const targetId = editingBookmark.id
      setEditingBookmark(null)
      void updateBookmark(targetId, checked.value, file, checked.ext).then((result) =>
        showToast(result.message, result.ok ? "success" : "error")
      )
    },
    [editingBookmark, updateBookmark, showToast]
  )

  const requestDeleteBookmark = useCallback((id: string) => {
    setDeleteTargetId(id)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTargetId) return
    const id = deleteTargetId
    setDeleteTargetId(null)
    void deleteBookmark(id).then((result) =>
      showToast(result.message, result.ok ? "success" : "error")
    )
  }, [deleteTargetId, deleteBookmark, showToast])

  const handleArchive = useCallback(
    (id: string) => {
      void archiveBookmark(id).then((result) =>
        showToast(result.message, result.ok ? "success" : "error")
      )
    },
    [archiveBookmark, showToast]
  )

  const handleUnarchive = useCallback(
    (id: string) => {
      void unarchiveBookmark(id).then((result) =>
        showToast(result.message, result.ok ? "success" : "error")
      )
    },
    [unarchiveBookmark, showToast]
  )

  const openAddModal = useCallback(() => setIsAddOpen(true), [])
  const closeModal = useCallback(() => {
    setIsAddOpen(false)
    setEditingBookmark(null)
  }, [])
  const cancelDelete = useCallback(() => setDeleteTargetId(null), [])

  /* =========================
     Filtering & Sorting
  ========================= */
  const filteredBookmarks = useMemo(
    () =>
      sortBookmarks(
        filterBookmarks(bookmarks, {
          mode,
          search,
          priority: priorityFilter,
          category: categoryFilter,
        }),
        sortBy
      ),
    [bookmarks, mode, search, priorityFilter, categoryFilter, sortBy]
  )

  const deleteTargetTitle = deleteTargetId
    ? (bookmarks.find((b) => b.id === deleteTargetId)?.title ?? "")
    : ""

  const getHeaderTitle = () => {
    switch (mode) {
      case "priority":
        return "Priority Items"
      case "archived": return "Archive"
      case "categories": return "Categories"
      default: return "All Bookmarks"
    }
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 pb-10">

      <BookmarkToolbar
        headerTitle={getHeaderTitle()}
        user={user}
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortChange={updateSortBy}
        viewMode={viewMode}
        onViewModeChange={updateViewMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNewBookmark={openAddModal}
      />

      <BookmarkSubFilters
        mode={mode}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      {/* ===== CONTENT AREA ===== */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingLogo />
        ) : loadError ? (
          <motion.div
            key="load-error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-gray-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-center"
          >
            <p className="text-themeMuted max-w-md mx-auto mb-8">
              Couldn&apos;t load your bookmarks.
            </p>
            <button
              onClick={() => void reload()}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-purple-500/25"
            >
              Try again
            </button>
          </motion.div>
        ) : filteredBookmarks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-gray-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-center"
          >
            <div className="w-20 h-20 mb-6 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <Folder size={40} className="text-purple-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-themeText">
              No bookmarks found
            </h2>
            <p className="text-themeMuted max-w-md mx-auto mb-8">
              Your vault is currently empty in this view. Start building your knowledge base by adding an item.
            </p>
            <button
              onClick={openAddModal}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-purple-500/25"
            >
              Add First Bookmark
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={
              viewMode === "cards"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : viewMode === "list"
                  ? "flex flex-col gap-4"
                  : viewMode === "headlines"
                    ? "flex flex-col gap-3"
                    : "columns-1 xs:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4"
            }
          >
            {filteredBookmarks.map((b) => (
              <BookmarkCard
                key={b.id}
                bookmark={b}
                viewType={viewMode}
                onDelete={requestDeleteBookmark}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
                onEdit={setEditingBookmark}
                isPending={isPendingId(b.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD/EDIT MODAL (mounted only while open, so its fields and file reset on close) */}
      {(isAddOpen || editingBookmark) && (
        <BookmarkFormModal
          key={editingBookmark ? editingBookmark.id : "add"}
          mode={editingBookmark ? "edit" : "add"}
          initial={
            editingBookmark
              ? {
                  title: editingBookmark.title,
                  url: editingBookmark.url || "",
                  description: editingBookmark.description || "",
                  priority: (editingBookmark.priority as 1 | 2 | 3) || "Auto",
                }
              : EMPTY_FORM
          }
          onSubmit={editingBookmark ? handleEdit : handleAdd}
          onClose={closeModal}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteTargetId && (
          <DeleteConfirmModal
            title={deleteTargetTitle}
            onConfirm={handleConfirmDelete}
            onCancel={cancelDelete}
          />
        )}
      </AnimatePresence>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  )
}
