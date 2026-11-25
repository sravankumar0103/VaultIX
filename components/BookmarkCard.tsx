"use client"

import type { Bookmark } from "@/types/bookmark"
import { memo, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { getMediaKind } from "@/lib/mediaType"
import { getHostname } from "@/lib/url"
import { formatShortDate } from "@/lib/formatDate"
import PriorityStars from "@/components/bookmark-card/PriorityStars"
import CategoryBadge from "@/components/bookmark-card/CategoryBadge"
import ActionButtons from "@/components/bookmark-card/ActionButtons"
import ActionFooter from "@/components/bookmark-card/ActionFooter"
import MediaThumb from "@/components/bookmark-card/MediaThumb"
import MediaTheatreOverlay from "@/components/bookmark-card/MediaTheatreOverlay"
import { getFaviconUrl, resolveMedia } from "@/components/bookmark-card/resolveMedia"

type ViewType = "list" | "headlines" | "cards" | "moodboard"

type Props = {
  bookmark: Bookmark
  viewType: ViewType
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onUnarchive?: (id: string) => void
  onEdit: (bookmark: Bookmark) => void
  isPending?: boolean
}

function BookmarkCard({
  bookmark,
  viewType,
  onDelete,
  onArchive,
  onUnarchive,
  onEdit,
  isPending = false,
}: Props) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  /* ===================================================== */
  /* ================= MEDIA RESOLUTION =================== */
  /* ===================================================== */

  const { fileUrl, linkUrl, directVideoUrl, theatreUrl, theatreKind, hasVisual } = resolveMedia(bookmark)
  const mediaKind = getMediaKind(bookmark.media_url)
  const favicon = getFaviconUrl(linkUrl)
  const isMedia = !!bookmark.media_url
  const displayDate = bookmark.created_at ? formatShortDate(bookmark.created_at) : ""
  const domainName = linkUrl ? getHostname(linkUrl) : ""

  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (showOverlay) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShowOverlay(false);
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showOverlay]);

  const actionProps = { bookmark, isMobile, onDelete, onArchive, onUnarchive, onEdit, isPending }

  const theatreOverlay = (
    <MediaTheatreOverlay
      show={showOverlay}
      onClose={() => setShowOverlay(false)}
      bookmark={bookmark}
      mediaUrl={theatreUrl}
      mediaKind={theatreKind}
      domainName={domainName}
    />
  )

  const openExternal = (url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  // The thumbnail: the theatre for a PDF, a video or a direct video link; otherwise
  // the uploaded file, else the saved link, in a new tab
  const openMedia = () => {
    if (theatreUrl) setShowOverlay(true);
    else openExternal(fileUrl ?? linkUrl);
  }

  // Title and text: the saved link when there is one (a direct video link has the theatre instead)
  const openLink = () => {
    if (linkUrl && !directVideoUrl) openExternal(linkUrl);
    else openMedia();
  }

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openLink();
  };

  if (viewType === "cards") {
    return (
      <>
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          className="group block relative rounded-2xl p-6 flex flex-col justify-between h-full bg-themeCard hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-400 border border-white/5 cursor-default"
        >
          <MediaThumb bookmark={bookmark} mediaKind={mediaKind} variant="card" onOpen={openMedia} />

          <div className="flex-1 flex flex-col">
            <div className={`absolute top-4 right-4 z-10 transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${hasVisual ? "bg-black/40 backdrop-blur-md rounded-xl p-1" : ""}`}>
              <ActionButtons {...actionProps} />
            </div>

            <button
              onClick={handleLinkClick}
              className="group/link block text-left"
            >
              <h3 className="font-bold text-lg leading-tight text-themeText line-clamp-2 mb-2 group-hover/link:text-purple-500 transition-colors">
                {bookmark.title}
              </h3>
            </button>

            {!bookmark.description && domainName && (
              <span className="text-xs text-themeMuted mb-2">{domainName}</span>
            )}

            {bookmark.description && (
              <p className="text-sm text-themeMuted line-clamp-2 leading-relaxed mb-4">
                {bookmark.description}
              </p>
            )}

            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CategoryBadge category={bookmark.category} isMedia={isMedia} />
                <PriorityStars priority={bookmark.priority} isMobile={isMobile} />
              </div>
            </div>
          </div>
        </motion.div>
        {theatreOverlay}
      </>
    )
  }

  if (viewType === "list") {
    return (
      <>
        <motion.div
          whileHover={{ x: 4 }}
          className="group flex flex-col sm:flex-row gap-6 items-start sm:items-center p-6 rounded-2xl bg-themeCard hover:shadow-xl transition-all border border-white/5 cursor-default"
        >
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <MediaThumb bookmark={bookmark} mediaKind={mediaKind} variant="list" onOpen={openMedia} />

            <div
              onClick={handleLinkClick}
              className="flex flex-col gap-1 min-w-0 group/link cursor-pointer"
            >
              <h3 className="font-bold text-lg text-themeText truncate group-hover/link:text-purple-500 transition-colors">
                {bookmark.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-themeMuted truncate">
                {domainName && <span className="truncate">{domainName}</span>}
                {domainName && <span className="w-1 h-1 rounded-full bg-gray-400/50"></span>}
                <span>{displayDate}</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block flex-1 border-l border-white/5 pl-6" onClick={handleLinkClick}>
            <p className="text-sm text-themeMuted line-clamp-2 cursor-pointer">
              {bookmark.description || <span className="italic opacity-50">No description provided</span>}
            </p>
          </div>

          <div className="flex items-center gap-6 shrink-0 ml-auto w-full sm:w-auto justify-between sm:justify-end border-t border-white/5 sm:border-0 pt-4 sm:pt-0 mt-4 sm:mt-0">
            <div className="flex items-center gap-4">
              <CategoryBadge category={bookmark.category} isMedia={isMedia} />
              <PriorityStars priority={bookmark.priority} isMobile={isMobile} />
            </div>
            <ActionButtons {...actionProps} />
          </div>
        </motion.div>
        {theatreOverlay}
      </>
    )
  }

  if (viewType === "headlines") {
    return (
      <>
        <motion.div
          className="group flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-default"
        >
          <div
            onClick={handleLinkClick}
            className="flex items-center gap-4 min-w-0 pr-4 flex-1 group/link cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
              {favicon ? <img src={favicon} alt="logo" className="w-5 h-5 object-contain" loading="lazy" decoding="async" /> : <div className="w-2 h-2 rounded-full bg-purple-500" />}
            </div>

            <h3 className="font-medium text-themeText truncate group-hover/link:text-purple-500 transition-colors">
              {bookmark.title}
            </h3>

            <span className="text-xs text-themeMuted hidden sm:inline-block truncate max-w-[200px]">
              {domainName}
            </span>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="hidden md:flex items-center gap-4">
              <span className="text-xs text-themeMuted w-24 text-right">{displayDate}</span>
              <PriorityStars priority={bookmark.priority} isMobile={isMobile} />
            </div>
            <ActionButtons {...actionProps} />
          </div>
        </motion.div>
        {theatreOverlay}
      </>
    )
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        className="group relative glass rounded-2xl overflow-hidden bg-themeCard h-auto break-inside-avoid shadow-sm hover:shadow-xl transition-all duration-300 cursor-default"
      >
        <MediaThumb bookmark={bookmark} mediaKind={mediaKind} variant="moodboard" onOpen={openMedia} />

        {/* Universal Mobile Footer */}
        <ActionFooter {...actionProps} />

        {/* Desktop Hover Panel */}
        {!isMobile && (
          <div className="p-4 bg-themeCard/90 backdrop-blur-md absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col gap-3 border-t border-white/10" onClick={handleLinkClick}>
            {hasVisual && (
              <h4 className="font-medium text-sm text-themeText truncate cursor-pointer">{bookmark.title}</h4>
            )}
            <div className="flex items-center justify-between">
              <PriorityStars priority={bookmark.priority} isMobile={isMobile} />
              <ActionButtons {...actionProps} />
            </div>
          </div>
        )}
      </motion.div>
      {theatreOverlay}
    </>
  )
}

export default memo(BookmarkCard)
