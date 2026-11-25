"use client"

import { useState } from "react"
import { motion } from "framer-motion"

export type BookmarkFormValues = {
  title: string
  url: string
  description: string
  priority: "Auto" | 1 | 2 | 3
}

type Props = {
  mode: "add" | "edit"
  initial: BookmarkFormValues
  onSubmit: (values: BookmarkFormValues, file: File | null) => void
  onClose: () => void
}

export default function BookmarkFormModal({ mode, initial, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(initial.title)
  const [url, setUrl] = useState(initial.url)
  const [description, setDescription] = useState(initial.description)
  const [priority, setPriority] = useState<BookmarkFormValues["priority"]>(initial.priority)
  const [mediaFile, setMediaFile] = useState<File | null>(null)

  return (
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
                {mode === "edit" ? "Edit Bookmark" : "Store in Vault"}
              </h3>
              <button
                onClick={onClose}
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
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1 flex-1">
                  <label className="text-[11px] font-medium text-themeMuted uppercase tracking-wider ml-0.5">
                    URL
                  </label>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl bg-themeSurface border border-white/5 text-themeText focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all placeholder:text-themeMuted/50 text-sm"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
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
                    value={priority}
                    onChange={(e) => {
                      setPriority(e.target.value === "Auto" ? "Auto" : Number(e.target.value) as 1 | 2 | 3)
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button
                onClick={() => onSubmit({ title, url, description, priority }, mediaFile)}
                className="w-full mt-2 bg-purple-500 hover:bg-purple-600 py-2.5 rounded-xl font-medium text-white transition-all shadow-lg shadow-purple-500/25 border border-purple-400/20 active:scale-[0.98] text-sm"
              >
                {mode === "edit" ? "Save Changes" : "Store in Vault"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
