"use client"

import type { Bookmark } from "@/types/bookmark"
import { FileText, Play, X, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type Props = {
  show: boolean
  onClose: () => void
  bookmark: Bookmark
  mediaType: "pdf" | "video" | "generic"
  isDirectVideoFile: boolean
  cardLink: string | undefined
  domainName: string
}

export default function MediaTheatreOverlay({
  show,
  onClose,
  bookmark,
  mediaType,
  isDirectVideoFile,
  cardLink,
  domainName,
}: Props) {
  const isPdf = mediaType === "pdf"
  const isVideo = mediaType === "video" || isDirectVideoFile
  const finalMediaUrl = isDirectVideoFile ? bookmark.url : (bookmark.url || bookmark.media_url)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#030303]/90 backdrop-blur-2xl"
            onClick={onClose}
          />

          {/* Theatre Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full h-full max-w-6xl bg-zinc-950 rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
                  {isPdf ? <FileText size={20} /> : <Play size={20} />}
                </div>
                <div>
                  <h2 className="text-white font-bold tracking-tight">{bookmark.title}</h2>
                  <p className="text-themeMuted text-xs">{domainName || "VaultIX Internal"}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 rounded-full hover:bg-white/5 text-themeMuted hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 w-full h-full bg-black relative flex items-center justify-center">
              {finalMediaUrl ? (
                isPdf ? (
                  <iframe
                    src={finalMediaUrl}
                    className="w-full h-full border-0"
                    title="PDF Viewer"
                  />
                ) : isVideo ? (
                  <video
                    src={finalMediaUrl}
                    controls
                    autoPlay
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <ExternalLink size={48} className="text-white/10 mx-auto" strokeWidth={1} />
                    <p className="text-themeMuted font-medium italic">Preview not available for this type.</p>
                    <a href={cardLink} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2 bg-purple-500 rounded-full font-bold text-sm">Open in New Tab</a>
                  </div>
                )
              ) : (
                <div className="text-center space-y-4">
                  <ExternalLink size={48} className="text-white/10 mx-auto" strokeWidth={1} />
                  <p className="text-themeMuted font-medium italic">Source URL is missing.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
