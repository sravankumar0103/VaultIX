"use client"

import type { Bookmark } from "@/types/bookmark"
import { memo, useEffect, useState } from "react"
import { ExternalLink, FileText, Play } from "lucide-react"
import { motion } from "framer-motion"
import PriorityStars from "@/components/bookmark-card/PriorityStars"
import CategoryBadge from "@/components/bookmark-card/CategoryBadge"
import ActionButtons from "@/components/bookmark-card/ActionButtons"
import ActionFooter from "@/components/bookmark-card/ActionFooter"
import MediaPlaceholder from "@/components/bookmark-card/MediaPlaceholder"
import VideoPreview from "@/components/bookmark-card/VideoPreview"
import PdfPreview from "@/components/bookmark-card/PdfPreview"
import MediaTheatreOverlay from "@/components/bookmark-card/MediaTheatreOverlay"

type ViewType = "list" | "headlines" | "cards" | "moodboard"

type Props = {
  bookmark: Bookmark
  viewType: ViewType
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onUnarchive?: (id: string) => void
  onEdit: (bookmark: Bookmark) => void
}

function BookmarkCard({
  bookmark,
  viewType,
  onDelete,
  onArchive,
  onUnarchive,
  onEdit,
}: Props) {
  const [isMobile, setIsMobile] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [useFallbackThumb, setUseFallbackThumb] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  /* ===================================================== */
  /* ================= MEDIA RESOLUTION =================== */
  /* ===================================================== */

  const isMediaCategory = (bookmark.category || "").toLowerCase().includes('media');

  const getVideoThumbnail = (url: string) => {
    if (!url || !isMediaCategory) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return useFallbackThumb
        ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
        : `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
    }
    const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
    return null;
  }

  const videoThumb = getVideoThumbnail(bookmark.url || "");
  const isDirectVideoFile = !!bookmark.url?.match(/\.(mp4|webm|mov|ogg)$/i) && !videoThumb;
  const effectiveMediaUrl = bookmark.media_url || videoThumb;

  const mediaType = (() => {
    const url = (bookmark.url || "").toLowerCase();
    const title = (bookmark.title || "").toLowerCase();
    const cat = (bookmark.category || "").toLowerCase();

    if (isMediaCategory) {
      if (url.endsWith('.pdf') || title.includes('pdf') || cat.includes('pdf') || title.includes('insights') || title.includes('book')) return 'pdf';
      if (url.includes('youtube') || url.includes('vimeo') || title.includes('video') || cat.includes('video')) return 'video';
    }

    return 'generic';
  })()

  // Favicon logic
  let favicon = ""
  try {
    const urlStr = bookmark.url || ""
    if (urlStr) {
      const formattedUrl = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`
      const hostname = new URL(formattedUrl).hostname
      if (hostname.includes('vaultix') || hostname.includes('localhost')) {
        favicon = "/vaultix-icon.png"
      } else {
        favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
      }
    }
  } catch (error) {
    favicon = ""
  }

  const hasBoth = !!bookmark.media_url && !!bookmark.url
  const isMedia = !!bookmark.media_url
  const cardLink = hasBoth
    ? (bookmark.url?.startsWith("http") ? bookmark.url : `https://${bookmark.url}`)
    : isMedia
      ? bookmark.media_url
      : bookmark.url?.startsWith("http") ? bookmark.url : bookmark.url ? `https://${bookmark.url}` : "#"

  const displayDate = bookmark.created_at
    ? new Date(bookmark.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : ""
  const domainName = bookmark.url ? (() => { try { return new URL(cardLink as string).hostname.replace("www.", "") } catch { return "" } })() : ""

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

  const actionProps = { bookmark, isMobile, onDelete, onArchive, onUnarchive, onEdit }

  const theatreOverlay = (
    <MediaTheatreOverlay
      show={showOverlay}
      onClose={() => setShowOverlay(false)}
      bookmark={bookmark}
      mediaType={mediaType}
      isDirectVideoFile={isDirectVideoFile}
      cardLink={cardLink ?? undefined}
      domainName={domainName}
    />
  )

  const handleMediaClick = (e: React.MouseEvent) => {
    if (mediaType !== 'generic' || isDirectVideoFile) {
      e.preventDefault();
      e.stopPropagation();
      setShowOverlay(true);
    } else if (cardLink) {
      e.preventDefault();
      e.stopPropagation();
      window.open(cardLink as string, '_blank', 'noopener,noreferrer');
    }
  };

  if (viewType === "cards") {
    return (
      <>
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          className="group block relative rounded-2xl p-6 flex flex-col justify-between h-full bg-themeCard hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-400 border border-white/5 cursor-default"
        >
          {effectiveMediaUrl && !imgError && !isDirectVideoFile ? (
            <div className="relative w-full h-40 mb-5 overflow-hidden rounded-xl border border-white/5 bg-black/5">
              <div 
                onClick={handleMediaClick}
                className="block w-full h-full relative cursor-pointer group/img"
              >
                <img
                  src={effectiveMediaUrl}
                  alt="media"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={() => {
                    if (!useFallbackThumb && effectiveMediaUrl?.includes('youtube')) {
                      setUseFallbackThumb(true);
                    } else {
                      setImgError(true);
                    }
                  }}
                />
                {(mediaType !== 'generic' || hasBoth) && (
                  <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {mediaType !== 'generic' ? 'View inside Theater ↗' : 'View Media ↗'}
                  </span>
                )}
              </div>
            </div>
          ) : mediaType === 'video' && (bookmark.url || bookmark.media_url) ? (
            <div
              onClick={handleMediaClick}
              className="block relative w-full h-40 mb-5 overflow-hidden rounded-xl border border-white/5 bg-black/5 cursor-pointer"
            >
              <VideoPreview src={(bookmark.url || bookmark.media_url) as string} />
            </div>
          ) : mediaType === 'pdf' && (bookmark.url || bookmark.media_url) ? (
            <div
              onClick={handleMediaClick}
              className="block relative w-full h-40 mb-5 overflow-hidden rounded-xl border border-white/5 bg-black/5 cursor-pointer"
            >
              <PdfPreview src={(bookmark.url || bookmark.media_url) as string} />
            </div>
          ) : (effectiveMediaUrl && imgError) || mediaType !== 'generic' ? (
            <div
              onClick={handleMediaClick}
              className="block relative w-full h-40 mb-5 overflow-hidden rounded-xl border border-white/5 bg-black/5 cursor-pointer"
            >
              <MediaPlaceholder mediaType={mediaType} />
            </div>
          ) : (
            <div className="flex items-start justify-between mb-4">
              <a
                href={cardLink as string}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0"
              >
                {favicon ? <img src={favicon} alt="logo" className="w-7 h-7 object-contain" /> : <ExternalLink size={20} className="text-themeMuted" />}
              </a>
              <div className="absolute top-4 right-4 z-10 transition-opacity opacity-0 group-hover:opacity-100 duration-300">
                <ActionButtons {...actionProps} />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col">
            {(effectiveMediaUrl || mediaType !== 'generic') && (
              <div className={`absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-md rounded-xl p-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100`}>
                <ActionButtons {...actionProps} />
              </div>
            )}

            <button
              onClick={handleMediaClick}
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
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner cursor-pointer" onClick={handleMediaClick}>
              {effectiveMediaUrl && !imgError && !isDirectVideoFile ? (
                <img 
                  src={effectiveMediaUrl} 
                  alt="media" 
                  className="w-full h-full object-cover" 
                  onError={() => {
                    if (!useFallbackThumb && effectiveMediaUrl?.includes('youtube')) {
                      setUseFallbackThumb(true);
                    } else {
                      setImgError(true);
                    }
                  }}
                />
              ) : mediaType === 'pdf' && (bookmark.url || bookmark.media_url) ? (
                <PdfPreview src={(bookmark.url || bookmark.media_url) as string} />
              ) : mediaType === 'video' && (bookmark.url || bookmark.media_url) ? (
                <VideoPreview src={(bookmark.url || bookmark.media_url) as string} />
              ) : mediaType === 'pdf' ? (
                <FileText size={24} className="text-purple-400/80" strokeWidth={1.5} />
              ) : mediaType === 'video' || isDirectVideoFile ? (
                <Play size={24} className="text-purple-400/80" strokeWidth={1.5} />
              ) : favicon ? (
                <img src={favicon} alt="logo" className="w-8 h-8 object-contain" />
              ) : (
                <ExternalLink size={24} className="text-themeMuted" />
              )}
            </div>

            <div
              onClick={handleMediaClick}
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

          <div className="hidden lg:block flex-1 border-l border-white/5 pl-6" onClick={handleMediaClick}>
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
            onClick={handleMediaClick}
            className="flex items-center gap-4 min-w-0 pr-4 flex-1 group/link cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
              {favicon ? <img src={favicon} alt="logo" className="w-5 h-5 object-contain" /> : <div className="w-2 h-2 rounded-full bg-purple-500" />}
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
        {effectiveMediaUrl && !imgError && !isDirectVideoFile ? (
          <div onClick={handleMediaClick} className="block w-full relative group/img cursor-pointer">
            <img
              src={effectiveMediaUrl}
              className="w-full object-cover"
              alt={bookmark.title}
              loading="lazy"
              onError={() => {
                if (!useFallbackThumb && effectiveMediaUrl?.includes('youtube')) {
                  setUseFallbackThumb(true);
                } else {
                  setImgError(true);
                }
              }}
            />
            {hasBoth && (
              <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white/80 backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-opacity">
                Open inside Theatre ↗
              </span>
            )}
          </div>
        ) : mediaType === 'video' && (bookmark.url || bookmark.media_url) ? (
          <div
            onClick={handleMediaClick}
            className="block w-full h-48 sm:h-64 cursor-pointer"
          >
            <VideoPreview src={(bookmark.url || bookmark.media_url) as string} />
          </div>
        ) : mediaType === 'pdf' && (bookmark.url || bookmark.media_url) ? (
          <div
            onClick={handleMediaClick}
            className="block w-full h-48 sm:h-64 cursor-pointer"
          >
            <PdfPreview src={(bookmark.url || bookmark.media_url) as string} />
          </div>
        ) : (effectiveMediaUrl && imgError) || mediaType !== 'generic' ? (
          <div
            onClick={handleMediaClick}
            className="block w-full h-48 sm:h-64 cursor-pointer"
          >
            <MediaPlaceholder mediaType={mediaType} />
          </div>
        ) : (
          <div onClick={handleMediaClick} className="block w-full p-6 bg-purple-500/10 border-b border-white/5 cursor-pointer">
            <h3 className="font-bold text-xl text-themeText mb-2 leading-tight">{bookmark.title}</h3>
            <p className="text-sm text-themeMuted line-clamp-3">{bookmark.description || domainName}</p>
          </div>
        )}

        {/* Universal Mobile Footer */}
        <ActionFooter {...actionProps} />

        {/* Action Indicators */}
        <div className={`absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-md rounded-xl p-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100`}>
          <ActionButtons {...actionProps} />
        </div>

        {/* Desktop Hover Panel */}
        {!isMobile && (
          <div className="p-4 bg-themeCard/90 backdrop-blur-md absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col gap-3 border-t border-white/10" onClick={handleMediaClick}>
            {(effectiveMediaUrl || mediaType !== 'generic') && (
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
