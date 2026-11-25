"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { runIX } from "@/lib/ixEngine"
import BookmarkCard from "@/components/BookmarkCard"
import type { Bookmark } from "@/types/bookmark"
import type { User } from "@supabase/supabase-js"
import Toast from "@/components/Toast"
import { Folder } from "lucide-react"
import { useTheme } from "@/app/ThemeContext"
import { motion, AnimatePresence } from "framer-motion"
import LoadingLogo from "@/components/LoadingLogo"
import { isDeletedAccountError, recoverFromAuthError } from "@/lib/authSession"
import BookmarkToolbar from "@/components/bookmarks/BookmarkToolbar"
import BookmarkSubFilters from "@/components/bookmarks/BookmarkSubFilters"
import BookmarkFormModal, {
  type BookmarkFormValues,
} from "@/components/bookmarks/BookmarkFormModal"
import DeleteConfirmModal from "@/components/bookmarks/DeleteConfirmModal"

const EMPTY_FORM: BookmarkFormValues = {
  title: "",
  url: "",
  description: "",
  priority: "Auto",
}

export default function BookmarkContainer({
  mode = "all",
}: {
  mode?: string
}) {
  /* =========================
     State
  ========================= */
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<"All" | 1 | 2 | 3>("All")
  const [categoryFilter, setCategoryFilter] = useState("All")

  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    title: string
  } | null>(null)

  const [isAddOpen, setIsAddOpen] = useState(false)

  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error"
  } | null>(null)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  const showToast = (message: string, type: "success" | "error") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }

  const [viewMode, setViewMode] = useState<
    "cards" | "list" | "headlines" | "moodboard"
  >("cards")
  const [sortBy, setSortBy] = useState<
    "date-desc" | "date-asc" | "name-asc" | "name-desc"
  >("date-desc")

  const router = useRouter()

  const { theme, toggleTheme, setTheme } = useTheme()

  /* =========================
     Auth & Preferences
  ========================= */
  useEffect(() => {
    const getUserAndPrefs = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          const recovered = await recoverFromAuthError(error.message)
          if (recovered && isDeletedAccountError(error.message)) {
            router.replace("/")
            return
          }
          return
        }

        if (user) {
          setUser(user)

          // Load Preferences from Metadata
          const meta = user.user_metadata
          if (meta.theme_preference) {
            localStorage.setItem("vaultix-default-theme", meta.theme_preference)
            // ONLY apply the default theme if the user hasn't toggled it this session
            const sessionTheme = sessionStorage.getItem("vaultix-session-theme")
            if (!sessionTheme) {
              setTheme(meta.theme_preference)
            }
          }
          if (meta.view_preference) {
            setViewMode(meta.view_preference)
          }
          if (meta.sort_preference) {
            setSortBy(meta.sort_preference)
          }
        }
      } catch (err) {
        // Ignore
      }
    }
    getUserAndPrefs()
  }, [router, setTheme])

  /* =========================
     Fetch + Realtime
  ========================= */
  useEffect(() => {
    if (!user) return

    fetchBookmarks()

    const channel = supabase
      .channel("bookmarks-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
        },
        (payload) => {
          console.log("Realtime event received:", payload)

          if (payload.eventType === "INSERT") {
            const newRecord = payload.new as Bookmark
            setBookmarks((prev) => {
              // Check if we already have this record (optimistic update handle)
              const exists = prev.find(b => b.id === newRecord.id)
              if (exists) return prev

              // Check if we have an optimistic record with the same title/url created very recently
              // This is a heuristic to replace temporary optimistic items with real ones
              const optimisticMatch = prev.find(b => 
                b.id.startsWith("opt-") && 
                b.title === newRecord.title && 
                b.url === newRecord.url
              )

              if (optimisticMatch) {
                return prev.map(b => b.id === optimisticMatch.id ? newRecord : b)
              }

              return [newRecord, ...prev]
            })
          } else if (payload.eventType === "UPDATE") {
            setBookmarks((prev) =>
              prev.map((b) => (b.id === payload.new.id ? (payload.new as Bookmark) : b))
            )
          } else if (payload.eventType === "DELETE") {
            setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  /* Persist View Mode */
  useEffect(() => {
    const saved = localStorage.getItem("vaultix-view-mode")
    if (saved === "grid") {
      setViewMode("cards")
    } else if (saved && !user?.user_metadata?.view_preference) {
      setViewMode(saved as any)
    }
  }, [user])

  const updateViewMode = async (v: typeof viewMode) => {
    setViewMode(v)
    localStorage.setItem("vaultix-view-mode", v)
    if (user) {
      try {
        await supabase.auth.updateUser({
          data: { view_preference: v }
        })
      } catch (err) {
        console.error("Failed to sync view preference:", err)
      }
    }
  }

  const fetchBookmarks = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      if (data) setBookmarks(data)
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error fetching bookmarks:", err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const savedSort = localStorage.getItem("vaultix-sort-mode")
    if (savedSort && !user?.user_metadata?.sort_preference) {
      setSortBy(savedSort as any)
    }
  }, [user])

  const updateSortBy = async (s: typeof sortBy) => {
    setSortBy(s)
    localStorage.setItem("vaultix-sort-mode", s)
    if (user) {
      try {
        await supabase.auth.updateUser({
          data: { sort_preference: s }
        })
      } catch (err) {
        console.error("Failed to sync sort preference:", err)
      }
    }
  }

  /* =========================
     Actions
  ========================= */
   const addBookmark = async (values: BookmarkFormValues, mediaFile: File | null) => {
    if (!values.title || (!values.url && !mediaFile) || !user) return

    const bookmarkData = {
      title: values.title,
      url: values.url,
      description: values.description,
      manualPriority: values.priority
    }

    // 1. Close the form immediately (Snappiness); it unmounts with its own state
    setIsAddOpen(false)

    // 2. Optimistic Update
    const optimisticId = `opt-${Date.now()}`
    const ix = runIX(bookmarkData.url, bookmarkData.title)
    
    const optimisticBookmark: Bookmark = {
      id: optimisticId,
      user_id: user.id,
      title: bookmarkData.title,
      url: bookmarkData.url || null,
      description: bookmarkData.description,
      domain: ix.domain,
      category: mediaFile ? (bookmarkData.url ? "Media+URL" : "Media") : "URL",
      media_url: mediaFile ? URL.createObjectURL(mediaFile) : null,
      priority: (() => {
        if (bookmarkData.manualPriority === "Auto") {
          const importance = ix.importance as string
          if (importance === "Critical" || importance === "High") return 3
          if (importance === "Medium") return 2
          return 1
        }
        return Number(bookmarkData.manualPriority)
      })(),
      tags: ix.tags,
      is_archived: false,
      created_at: new Date().toISOString(),
    }

    setBookmarks(prev => [optimisticBookmark, ...prev])

    // 3. Background Persistence
    try {
      let mediaUrl: string | null = null

      if (mediaFile) {
        const ext = mediaFile.name.split(".").pop() || "bin"
        const slug = bookmarkData.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").slice(0, 60)
        const randomId = Math.random().toString(36).substring(2, 6)
        const fileName = `${slug}-${randomId}.${ext}`

        const { error: uploadError } = await supabase.storage.from("media").upload(fileName, mediaFile)
        if (uploadError) throw uploadError
        
        const { data } = supabase.storage.from("media").getPublicUrl(fileName)
        mediaUrl = data.publicUrl
      }

      const { data: newBookmark, error } = await supabase.from("bookmarks").insert([
        {
          title: bookmarkData.title,
          url: bookmarkData.url || null,
          description: bookmarkData.description,
          user_id: user.id,
          domain: ix.domain,
          category: mediaFile ? (bookmarkData.url ? "Media+URL" : "Media") : "URL",
          media_url: mediaUrl,
          priority: optimisticBookmark.priority,
          tags: ix.tags,
        },
      ]).select().single()

      if (error) throw error

      // Update local state with real record if realtime hasn't done it yet
      setBookmarks(prev => prev.map(b => b.id === optimisticId ? (newBookmark as Bookmark) : b))
      showToast("Bookmark created successfully", "success")

    } catch (err: any) {
      console.error("Add failed:", err)
      // Rollback
      setBookmarks(prev => prev.filter(b => b.id !== optimisticId))
      showToast("Failed to create bookmark", "error")
    }
  }


   const deleteBookmark = async (id: string) => {
    const target = bookmarks.find((b) => b.id === id)
    if (!target) return

    // Optimistic update
    setBookmarks((prev) => prev.filter((b) => b.id !== id))

    const performDelete = async () => {
      // Background storage deletion
      if (target?.media_url) {
        const storagePrefix = "/storage/v1/object/public/media/"
        const idx = target.media_url.indexOf(storagePrefix)
        if (idx !== -1) {
          const filePath = target.media_url.slice(idx + storagePrefix.length)
          supabase.storage.from("media").remove([filePath])
        }
      }

      const { error } = await supabase.from("bookmarks").delete().eq("id", id)
      if (error) {
        showToast("Delete failed — rolling back", "error")
        // Rollback: re-insert the bookmark in its original position or just add it back
        setBookmarks(prev => [target, ...prev])
        fetchBookmarks() // Sync with server just in case
      } else {
        showToast("Bookmark deleted", "success")
      }
    }

    performDelete()
  }


  const requestDeleteBookmark = (id: string) => {
    const target = bookmarks.find((b) => b.id === id)
    setDeleteTarget({
      id,
      title: target?.title || "",
    })
  }

  const archiveBookmark = async (id: string) => {
    // Optimistic update
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_archived: true } : b))
    )

    const { error } = await supabase.from("bookmarks").update({ is_archived: true }).eq("id", id)
    if (error) {
      showToast("Archive failed", "error")
      // Revert by refetching the latest state
      fetchBookmarks()
    } else {
      showToast("Bookmark archived", "success")
    }
  }

  const unarchiveBookmark = async (id: string) => {
    // Optimistic update
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_archived: false } : b))
    )

    const { error } = await supabase.from("bookmarks").update({ is_archived: false }).eq("id", id)
    if (error) {
      showToast("Unarchive failed", "error")
      // Revert by refetching the latest state
      fetchBookmarks()
    } else {
      showToast("Bookmark restored", "success")
    }
  }

  const updateBookmark = async (values: BookmarkFormValues, mediaFile: File | null) => {
    if (!editingBookmark) return

    const originalBookmark = { ...editingBookmark }
    const ix = runIX(values.url, values.title)

    const isMedia = !!mediaFile || !!editingBookmark.media_url
    const category = isMedia ? (values.url ? "Media+URL" : "Media") : "URL"

    const updatedData = {
      title: values.title,
      url: values.url,
      description: values.description,
      domain: ix.domain,
      category: category,
      priority: (() => {
        if (values.priority === "Auto") {
          const importance = ix.importance as string
          if (importance === "Critical" || importance === "High") return 3
          if (importance === "Medium") return 2
          return 1
        }
        return Number(values.priority)
      })(),
      tags: ix.tags,
    }

    // Capture the ID
    const bookmarkId = editingBookmark.id

    // 1. Optimistic Update
    setBookmarks((prev) =>
      prev.map((b) => (b.id === bookmarkId ? { ...b, ...updatedData } : b))
    )
    setEditingBookmark(null)

    // 2. Background Persistence
    try {
      let mediaUrl = editingBookmark.media_url || null

      if (mediaFile) {
        // Delete old one if exists
        if (editingBookmark.media_url) {
           const storagePrefix = "/storage/v1/object/public/media/"
           const idx = editingBookmark.media_url.indexOf(storagePrefix)
           if (idx !== -1) {
             const filePath = editingBookmark.media_url.slice(idx + storagePrefix.length)
             await supabase.storage.from("media").remove([filePath])
           }
        }

        // Upload new one
        const ext = mediaFile.name.split(".").pop() || "bin"
        const slug = values.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").slice(0, 60)
        const randomId = Math.random().toString(36).substring(2, 6)
        const fileName = `${slug}-${randomId}.${ext}`

        const { error: uploadError } = await supabase.storage.from("media").upload(fileName, mediaFile)
        if (uploadError) throw uploadError
        
        const { data } = supabase.storage.from("media").getPublicUrl(fileName)
        mediaUrl = data.publicUrl
      }

      const { error } = await supabase
        .from("bookmarks")
        .update({
          ...updatedData,
          media_url: mediaUrl
        })
        .eq("id", bookmarkId)

      if (error) throw error

      showToast("Bookmark updated", "success")
    } catch (err) {
      console.error("Update failed:", err)
      showToast("Update failed — rolling back", "error")
      // Rollback
      setBookmarks((prev) =>
        prev.map((b) => (b.id === bookmarkId ? originalBookmark : b))
      )
    }
  }

  /* =========================
     Filtering & Sorting
  ========================= */
  const filteredBookmarks = bookmarks
    .filter((b) => {
      const query = search.toLowerCase()
      const matchesSearch =
        b.title?.toLowerCase().includes(query) ||
        b.domain?.toLowerCase().includes(query) ||
        b.category?.toLowerCase().includes(query) ||
        b.tags?.some((tag) => tag.toLowerCase().includes(query))

      let matchesMode = b.is_archived !== true
      if (mode === "archived") {
        matchesMode = b.is_archived === true
      } else if (mode === "priority") {
        if (priorityFilter !== "All") {
          matchesMode = (b.priority ?? 0) === Number(priorityFilter) && b.is_archived !== true
        } else {
          matchesMode = (b.priority ?? 0) >= 1 && b.is_archived !== true
        }
      } else {
        if (priorityFilter !== "All") {
          matchesMode = (b.priority ?? 0) === Number(priorityFilter) && b.is_archived !== true
        }
      }

      const matchesCategory = categoryFilter === "All" || b.category === categoryFilter

      return matchesSearch && matchesCategory && matchesMode
    })
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      
      if (sortBy === "date-desc") return dateB - dateA
      if (sortBy === "date-asc") return dateA - dateB
      
      const titleA = (a.title || "").toLowerCase()
      const titleB = (b.title || "").toLowerCase()
      
      if (sortBy === "name-asc") return titleA.localeCompare(titleB)
      if (sortBy === "name-desc") return titleB.localeCompare(titleA)
      return 0
    })

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
        onNewBookmark={() => setIsAddOpen(true)}
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
              onClick={() => setIsAddOpen(true)}
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
                onArchive={archiveBookmark}
                onUnarchive={unarchiveBookmark}
                onEdit={setEditingBookmark}
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
          onSubmit={editingBookmark ? updateBookmark : addBookmark}
          onClose={() => { setIsAddOpen(false); setEditingBookmark(null); }}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            title={deleteTarget.title}
            onConfirm={() => {
              deleteBookmark(deleteTarget.id)
              setDeleteTarget(null)
            }}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
