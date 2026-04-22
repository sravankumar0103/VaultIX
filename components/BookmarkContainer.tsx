"use client"

import { useEffect, useState, Suspense, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { runIX } from "@/lib/ixEngine"
import BookmarkCard from "@/components/BookmarkCard"
import type { Bookmark } from "@/types/bookmark"
import type { User } from "@supabase/supabase-js"
import Toast from "@/components/Toast"
import { useRouter } from "next/navigation"
import {
  Clock,
  ArrowUp,
  ArrowDown,
  AArrowUp,
  AArrowDown,
  LayoutGrid,
  List,
  Eye,
  AlignJustify,
  LayoutDashboard,
  Sun,
  Moon,
  ArrowUpDown,
  Plus,
  Search,
  Settings2,
  Folder
} from "lucide-react"
import { useTheme } from "@/app/ThemeContext"
import { motion, AnimatePresence } from "framer-motion"
import LoadingLogo from "@/components/LoadingLogo"
import { isDeletedAccountError, recoverFromAuthError } from "@/lib/authSession"

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

  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)

  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<"All" | 1 | 2 | 3>("All")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [manualPriority, setManualPriority] = useState<"Auto" | 1 | 2 | 3>("Auto")

  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    title: string
  } | null>(null)

  const [editTitle, setEditTitle] = useState("")
  const [editUrl, setEditUrl] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPriority, setEditPriority] = useState<1 | 2 | 3 | "Auto" | "">("")

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

  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)

  const viewRef = useRef<HTMLDivElement | null>(null)
  const sortRef = useRef<HTMLDivElement | null>(null)
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
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (viewRef.current && !viewRef.current.contains(target)) {
        setIsViewOpen(false)
      }
      if (sortRef.current && !sortRef.current.contains(target)) {
        setIsSortOpen(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [])

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
   const addBookmark = async () => {
    if (!title || (!url && !mediaFile) || !user) return

    // Capture current values for reset and optimistic update
    const bookmarkData = {
      title,
      url,
      description,
      manualPriority
    }

    // 1. Reset UI Immediately (Snappiness)
    setTitle("")
    setUrl("")
    setDescription("")
    setManualPriority("Auto")
    setMediaFile(null)
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

  const updateBookmark = async () => {
    if (!editingBookmark) return
    
    const originalBookmark = { ...editingBookmark }
    const ix = runIX(editUrl, editTitle)
    
    const isMedia = !!mediaFile || !!editingBookmark.media_url
    const category = isMedia ? (editUrl ? "Media+URL" : "Media") : "URL"

    const updatedData = {
      title: editTitle,
      url: editUrl,
      description: editDescription,
      domain: ix.domain,
      category: category,
      priority: (() => {
        if (editPriority === "Auto" || editPriority === "") {
          const importance = ix.importance as string
          if (importance === "Critical" || importance === "High") return 3
          if (importance === "Medium") return 2
          return 1
        }
        return Number(editPriority)
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
        const slug = editTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").slice(0, 60)
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
      
      setMediaFile(null) // Clean up
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
      case "analytics": return "Insights"
      default: return "All Bookmarks"
    }
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 pb-10">

      {/* ===== HEADER SECTION ===== */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between pt-4">
        <div className="max-w-[calc(100vw-48px)]">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col">
            <h2 className="text-sm md:text-lg font-medium text-themeMuted mb-1 truncate">
              Hey, {user?.user_metadata?.full_name || user?.user_metadata?.name || "Sravan Kumar"}.
            </h2>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-themeText mb-2">
              {getHeaderTitle()}
            </h1>
          </motion.div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddOpen(true)}
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
            placeholder="Search by title, domain, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* View & Sort */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-y-visible pb-1 sm:pb-0 justify-center sm:justify-start">
          <div ref={sortRef} className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsSortOpen(!isSortOpen); }}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-themeText text-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <ArrowUpDown size={16} className="text-themeMuted" />
              <span>Sort</span>
            </button>

            {isSortOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 bg-themeCard border border-white/10 rounded-xl shadow-2xl p-1.5 z-[100]">
                {[
                  { id: "date-desc", label: "Newest first" },
                  { id: "date-asc", label: "Oldest first" },
                  { id: "name-asc", label: "Name (A-Z)" },
                  { id: "name-desc", label: "Name (Z-A)" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { updateSortBy(s.id as any); setIsSortOpen(false) }}
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
              onClick={(e) => { e.stopPropagation(); setIsViewOpen(!isViewOpen); }}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-themeText text-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Settings2 size={16} className="text-themeMuted" />
              <span>View</span>
            </button>

            {isViewOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-2 w-48 bg-themeCard border border-white/10 rounded-xl shadow-2xl p-1.5 z-[100]">
                {[
                  { id: "cards", icon: LayoutGrid, label: "Cards" },
                  { id: "list", icon: List, label: "Detailed List" },
                  { id: "headlines", icon: AlignJustify, label: "Headlines" },
                  { id: "moodboard", icon: LayoutDashboard, label: "Moodboard" }
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { updateViewMode(v.id as any); setIsViewOpen(false) }}
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
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-themeMuted hover:text-purple-500 transition-all active:scale-95"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* ===== PRIORITY SUB-FILTER ===== */}
      {mode === "priority" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-2 mb-2"
        >
          <span className="text-xs font-semibold text-themeMuted uppercase tracking-wider mr-2">Filter</span>
          <button
            onClick={() => setPriorityFilter("All")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${priorityFilter === "All"
              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
              : "bg-themeCard text-themeMuted hover:bg-white/5 border border-white/5"
              }`}
          >
            All
          </button>
          {[3, 2, 1].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p as 1 | 2 | 3)}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${priorityFilter === p
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                : "bg-themeCard text-themeMuted hover:bg-white/5 border border-white/5"
                }`}
              title={`${p} Stars`}
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
          {["URL", "Media"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${categoryFilter === cat
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                : "bg-themeCard text-themeMuted hover:bg-white/5 border border-white/5"
                }`}
            >
              {cat === "URL" ? "URL" : cat === "Media" ? "Media" : "All"}
            </button>
          ))}
        </motion.div>
      )}

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
                onEdit={(bookmark) => {
                  setEditingBookmark(bookmark)
                  setEditTitle(bookmark.title)
                  setEditUrl(bookmark.url || "")
                  setEditDescription(bookmark.description || "")
                  setEditPriority((bookmark.priority as 1 | 2 | 3) || "Auto")
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD/EDIT MODAL (Preserved logic, updated styles) */}
      {(isAddOpen || editingBookmark) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-themeCard w-full max-w-3xl md:max-w-4xl p-5 md:p-6 rounded-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto hide-scrollbar"
          >
            <div className="flex flex-col md:flex-row gap-6">
              {/* LEFT DESIGN PANEL */}
              <div className="hidden md:flex flex-col justify-between flex-1 rounded-2xl bg-gradient-to-b from-purple-500/25 via-purple-500/10 to-transparent border border-white/10 px-5 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-200/80 mb-2">
                    New Bookmark
                  </p>
                  <h2 className="text-2xl font-semibold text-white mb-3 leading-snug">
                    Capture the links that
                    <br />
                    actually matter to you.
                  </h2>
                  <p className="text-sm text-themeMuted/90">
                    Give each bookmark a clear title, context, and priority so future-you can
                    rediscover it in seconds.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-[11px] text-themeMuted/90">
                  <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2">
                    <p className="font-medium text-white mb-1">Stay organised</p>
                    <p>Use notes & priority to group what&apos;s truly important.</p>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2">
                    <p className="font-medium text-white mb-1">Never lose a gem</p>
                    <p>VaultIX keeps tutorials, docs and ideas ready to revisit.</p>
                  </div>
                </div>
              </div>

              {/* RIGHT FORM PANEL */}
              <div className="flex-1 bg-themeMain/40 md:bg-transparent rounded-2xl md:rounded-none md:border-l md:border-white/5 md:pl-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-themeText">
                    {editingBookmark ? "Edit Bookmark" : "Store in Vault"}
                  </h3>
                  <button
                    onClick={() => { setIsAddOpen(false); setEditingBookmark(null); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-themeSurface hover:bg-white/10 text-themeMuted transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="space-y-1 flex-1">
                      <label className="text-[11px] font-medium text-themeMuted uppercase tracking-wider ml-0.5">
                        Title
                      </label>
                      <input
                        className="w-full px-3 py-2.5 rounded-xl bg-themeSurface border border-white/5 text-themeText focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all placeholder:text-themeMuted/50 text-sm"
                        placeholder="E.g. Great React Tutorial"
                        value={(editingBookmark ? editTitle : title) || ""}
                        onChange={(e) => editingBookmark ? setEditTitle(e.target.value) : setTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1 flex-1">
                      <label className="text-[11px] font-medium text-themeMuted uppercase tracking-wider ml-0.5">
                        URL
                      </label>
                      <input
                        className="w-full px-3 py-2.5 rounded-xl bg-themeSurface border border-white/5 text-themeText focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all placeholder:text-themeMuted/50 text-sm"
                        placeholder="https://..."
                        value={(editingBookmark ? editUrl : url) || ""}
                        onChange={(e) => editingBookmark ? setEditUrl(e.target.value) : setUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="space-y-1 flex-1">
                      <label className="text-[11px] font-medium text-themeMuted uppercase tracking-wider ml-0.5">
                        Upload Media (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*,.pdf"
                        onChange={(e) => setMediaFile(e.target.files ? e.target.files[0] : null)}
                        className="w-full px-3 py-2.5 rounded-xl bg-themeSurface border border-white/5 text-themeText file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600 transition-all cursor-pointer text-sm"
                      />
                    </div>

                    <div className="space-y-1 flex-1">
                      <label className="text-[11px] font-medium text-themeMuted uppercase tracking-wider ml-0.5">
                        Priority
                      </label>
                      <select
                        value={editingBookmark ? editPriority : manualPriority}
                        onChange={(e) => {
                          const val = e.target.value === "Auto" ? "Auto" : Number(e.target.value) as 1 | 2 | 3;
                          editingBookmark ? setEditPriority(val as any) : setManualPriority(val);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-themeSurface border border-white/5 text-themeText focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all appearance-none text-sm"
                      >
                        <option value="Auto">Auto Priority</option>
                        <option value={3}>⭐⭐⭐ High Priority</option>
                        <option value={2}>⭐⭐ Normal Priority</option>
                        <option value={1}>⭐ Low Priority</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-themeMuted uppercase tracking-wider ml-0.5">
                      Notes
                    </label>
                    <textarea
                      className="w-full px-3 py-2.5 rounded-xl bg-themeSurface border border-white/5 text-themeText focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all placeholder:text-themeMuted/50 min-h-[70px] resize-none text-sm"
                      placeholder="Why are you saving this?"
                      value={(editingBookmark ? editDescription : description) || ""}
                      onChange={(e) => editingBookmark ? setEditDescription(e.target.value) : setDescription(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={editingBookmark ? updateBookmark : addBookmark}
                    className="w-full mt-2 bg-purple-500 hover:bg-purple-600 py-2.5 rounded-xl font-medium text-white transition-all shadow-lg shadow-purple-500/25 border border-purple-400/20 active:scale-[0.98] text-sm"
                  >
                    {editingBookmark ? "Save Changes" : "Store in Vault"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="bg-themeCard w-full max-w-sm p-5 rounded-2xl shadow-2xl border border-white/10"
            >
              <h3 className="text-lg font-semibold text-themeText mb-2">
                Delete this bookmark?
              </h3>
              <p className="text-sm text-themeMuted mb-5">
                {deleteTarget.title
                  ? `“${deleteTarget.title}” will be removed from your vault. This action cannot be undone.`
                  : "This bookmark will be removed from your vault. This action cannot be undone."}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl bg-themeSurface text-sm text-themeText border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteTarget) {
                      deleteBookmark(deleteTarget.id)
                    }
                    setDeleteTarget(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-sm text-white font-medium shadow-lg shadow-red-500/30 border border-red-400/40 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
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
