"use client"

import { useEffect, useId, useRef } from "react"
import { motion } from "framer-motion"
import { useDialog } from "@/lib/useDialog"

type Props = {
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({ title, onConfirm, onCancel }: Props) {
  const { dialogRef } = useDialog(true, onCancel)
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const headingId = useId()

  // Declared after useDialog so it runs second: the confirm button gets focus first.
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="bg-themeCard w-full max-w-sm p-5 rounded-2xl shadow-2xl border border-white/10"
      >
        <h3 id={headingId} className="text-lg font-semibold text-themeText mb-2">
          Delete this bookmark?
        </h3>
        <p className="text-sm text-themeMuted mb-5">
          {title
            ? `“${title}” will be removed from your vault. This action cannot be undone.`
            : "This bookmark will be removed from your vault. This action cannot be undone."}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-themeSurface text-sm text-themeText border border-white/10 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-sm text-white font-medium shadow-lg shadow-red-500/30 border border-red-400/40 transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}
