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
      viewport={{ amount: 0.1, margin: "-15% 0px -15% 0px" }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-1 ${isMobile ? "" : "opacity-0 group-hover:opacity-100 transition-opacity duration-200"}`}
    >
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(bookmark) }}
        className="p-2 text-themeMuted hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isPending}
        aria-disabled={isPending}
        title="Edit"
      >
        <Edit2 size={16} />
      </button>

      {bookmark.is_archived ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUnarchive?.(bookmark.id) }}
          className="p-2 text-themeMuted hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
          aria-disabled={isPending}
          title="Unarchive"
        >
          <ArchiveRestore size={16} />
        </button>
      ) : (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(bookmark.id) }}
          className="p-2 text-themeMuted hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
          aria-disabled={isPending}
          title="Archive"
        >
          <Archive size={16} />
        </button>
      )}

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(bookmark.id) }}
        className="p-2 text-themeMuted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isPending}
        aria-disabled={isPending}
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  )
}
