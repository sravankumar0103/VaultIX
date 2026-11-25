"use client"

import type { Bookmark } from "@/types/bookmark"
import { ArchiveRestore, Archive, Trash2, Edit2 } from "lucide-react"
import { motion } from "framer-motion"

export type ActionButtonsProps = {
  bookmark: Bookmark
  isMobile: boolean
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onUnarchive?: (id: string) => void
  onEdit: (bookmark: Bookmark) => void
  isPending?: boolean
}

export default function ActionButtons({
  bookmark,
  isMobile,
  onDelete,
  onArchive,
  onUnarchive,
  onEdit,
  isPending = false,
}: ActionButtonsProps) {
  return (
    <motion.div
      key={isMobile ? "m" : "d"}
      initial={isMobile ? { opacity: 0 } : false}
      whileInView={isMobile ? { opacity: 1 } : {}}
      viewport={{ once: true, amount: 0.1, margin: "-15% 0px -15% 0px" }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-1 ${isMobile ? "" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200"}`}
    >
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(bookmark) }}
        className="p-2 text-themeMuted enabled:hover:text-purple-500 enabled:hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isPending}
        aria-disabled={isPending}
        title="Edit"
        aria-label="Edit bookmark"
      >
        <Edit2 size={16} />
      </button>

      {bookmark.is_archived ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUnarchive?.(bookmark.id) }}
          className="p-2 text-themeMuted enabled:hover:text-green-500 enabled:hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
          aria-disabled={isPending}
          title="Unarchive"
          aria-label="Restore bookmark"
        >
          <ArchiveRestore size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(bookmark.id) }}
          className="p-2 text-themeMuted enabled:hover:text-orange-500 enabled:hover:bg-orange-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
          aria-disabled={isPending}
          title="Archive"
          aria-label="Archive bookmark"
        >
          <Archive size={16} />
        </button>
      )}

      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(bookmark.id) }}
        className="p-2 text-themeMuted enabled:hover:text-red-500 enabled:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isPending}
        aria-disabled={isPending}
        title="Delete"
        aria-label="Delete bookmark"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  )
}
