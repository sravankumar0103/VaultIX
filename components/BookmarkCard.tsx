import type { Bookmark } from "@/types/bookmark"
import { useEffect, useState } from "react"
import { ArchiveRestore, Archive, Trash2, Edit2, ExternalLink, Star, FileText, Play, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type ViewType = "list" | "headlines" | "cards" | "moodboard"

type Props = {
  bookmark: Bookmark
  viewType: ViewType
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onUnarchive?: (id: string) => void
  onEdit: (bookmark: Bookmark) => void
}

export default function BookmarkCard({
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

  const mediaLink = bookmark.media_url as string
  const displayDate = bookmark.created_at
    ? new Date(bookmark.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : ""
  const domainName = bookmark.url ? (() => { try { return new URL(cardLink as string).hostname.replace("www.", "") } catch { return "" } })() : ""

  /* ===================================================== */
  /* ================== SHARED COMPONENTS ================ */
  /* ===================================================== */

  const PriorityStars = ({ className = "" }: { className?: string }) => (
    <motion.div
      initial={isMobile ? { opacity: 0 } : false}
      whileInView={isMobile ? { opacity: 1 } : {}}
      viewport={{ amount: 0.1, margin: "-10% 0px -10% 0px" }}
      className={`flex gap-0.5 text-yellow-500 ${className}`}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < (bookmark.priority ?? 0) ? "fill-current" : "text-gray-300 dark:text-white/10"}
        />
      ))}
    </motion.div>
  )

  const CategoryBadge = () => (
    <span className="px-2.5 py-1 rounded-md bg-white/5 text-themeMuted text-xs font-semibold tracking-wide border border-white/10 group-hover:bg-purple-500/10 group-hover:text-purple-500 group-hover:border-purple-500/20 transition-all">
      {bookmark.category || (isMedia ? "Media" : "URL")}
    </span>
  )

  const ActionButtons = () => (
    <motion.div
      initial={isMobile ? { opacity: 0 } : false}
      whileInView={isMobile ? { opacity: 1 } : {}}
      viewport={{ amount: 0.1, margin: "-15% 0px -15% 0px" }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-1 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-200'}`}
    >
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(bookmark); }}
        className="p-2 text-themeMuted hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors"
        title="Edit"
      >
        <Edit2 size={16} />
      </button>

      {bookmark.is_archived ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUnarchive?.(bookmark.id); }}
          className="p-2 text-themeMuted hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
          title="Unarchive"
        >
          <ArchiveRestore size={16} />
        </button>
      ) : (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(bookmark.id); }}
          className="p-2 text-themeMuted hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
          title="Archive"
        >
          <Archive size={16} />
        </button>
      )}

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(bookmark.id); }}
        className="p-2 text-themeMuted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  )

  const ActionFooter = () => (
    <motion.div
      initial={isMobile ? { opacity: 0, y: 10 } : false}
      whileInView={isMobile ? { opacity: 1, y: 0 } : {}}
      viewport={{ amount: 0.1, margin: "-15% 0px -15% 0px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`p-3 bg-themeCard/90 backdrop-blur-md flex items-center justify-between border-t border-white/10 rounded-b-2xl absolute bottom-0 left-0 right-0 z-20 ${isMobile ? '' : 'hidden'}`}
    >
      <PriorityStars />
      <ActionButtons />
    </motion.div>
  )

  const MediaPlaceholder = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0e0e11] to-[#1a1a1f] relative overflow-hidden group-hover:from-purple-500/10 group-hover:to-indigo-500/10 transition-all duration-700">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px]" />
      </div>

      {mediaType === 'pdf' ? (
        <div className="relative z-10 flex flex-col items-center gap-4 w-full px-8">
          <div className="w-full aspect-[3/4] max-w-[80px] bg-white/[0.03] border border-white/10 rounded-lg p-3 flex flex-col gap-2.5 group-hover:border-purple-500/20 transition-all shadow-2xl">
            <div className="w-8 h-1.5 bg-purple-500/30 rounded-full mb-1" />
            <div className="flex flex-col gap-2 opacity-10">
              <div className="w-full h-1 bg-white rounded-full" />
              <div className="w-full h-8 bg-white/20 rounded-md" />
              <div className="w-3/4 h-1 bg-white rounded-full" />
            </div>
          </div>
          <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/10 group-hover:text-purple-400/40 transition-colors">Vault PDF</span>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-5">
          {mediaType === 'video' ? (
            <Play size={48} className="text-purple-400/20 fill-purple-400/5 transition-transform group-hover:scale-110 duration-700 ml-1" strokeWidth={1} />
          ) : (
            <ExternalLink size={38} className="text-white/5" strokeWidth={1} />
          )}
          <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/10 group-hover:text-purple-400/40 transition-colors">
            {mediaType === 'video' ? 'Video Stream' : 'Digital Asset'}
          </span>
        </div>
      )}
    </div>
  )

  const VideoPreview = ({ src }: { src: string }) => (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-black">
      <video src={`${src}#t=0.1`} muted playsInline className="w-full h-full object-cover" onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }} />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Play size={32} className="text-white/80" />
      </div>
    </div>
  )

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

  const MediaTheatreOverlay = () => {
    if (!showOverlay) return null;

    const isPdf = mediaType === 'pdf';
    const isVideo = mediaType === 'video' || isDirectVideoFile;
    const finalMediaUrl = isDirectVideoFile ? bookmark.url : (bookmark.url || bookmark.media_url);

    return (
      <AnimatePresence>
        {showOverlay && (
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
              onClick={() => setShowOverlay(false)}
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
                  onClick={() => setShowOverlay(false)}
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
                      <a href={cardLink as string} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2 bg-purple-500 rounded-full font-bold text-sm">Open in New Tab</a>
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
    );
  };

  const handleMediaClick = (e: React.MouseEvent) => {
    if (mediaType !== 'generic' || isDirectVideoFile) {
      e.preventDefault();
      e.stopPropagation();
      setShowOverlay(true);
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
          ) : isDirectVideoFile && bookmark.url ? (
            <div
              onClick={handleMediaClick}
              className="block relative w-full h-40 mb-5 overflow-hidden rounded-xl border border-white/5 bg-black/5 cursor-pointer"
            >
              <VideoPreview src={bookmark.url} />
            </div>
          ) : (effectiveMediaUrl && imgError) || mediaType !== 'generic' ? (
            <div
              onClick={handleMediaClick}
              className="block relative w-full h-40 mb-5 overflow-hidden rounded-xl border border-white/5 bg-black/5 cursor-pointer"
            >
              <MediaPlaceholder />
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
                <ActionButtons />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col">
            {(effectiveMediaUrl || mediaType !== 'generic') && (
              <div className={`absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-md rounded-xl p-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100`}>
                <ActionButtons />
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
                <CategoryBadge />
                <PriorityStars />
              </div>
            </div>
          </div>
        </motion.div>
        <MediaTheatreOverlay />
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
              {bookmark.media_url ? (
                <img src={bookmark.media_url} alt="media" className="w-full h-full object-cover" />
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
              <CategoryBadge />
              <PriorityStars />
            </div>
            <ActionButtons />
          </div>
        </motion.div>
        <MediaTheatreOverlay />
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
              <PriorityStars />
            </div>
            <ActionButtons />
          </div>
        </motion.div>
        <MediaTheatreOverlay />
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
        ) : isDirectVideoFile && bookmark.url ? (
          <div
            onClick={handleMediaClick}
            className="block w-full h-48 sm:h-64 cursor-pointer"
          >
            <VideoPreview src={bookmark.url} />
          </div>
        ) : (effectiveMediaUrl && imgError) || mediaType !== 'generic' ? (
          <div
            onClick={handleMediaClick}
            className="block w-full h-48 sm:h-64 cursor-pointer"
          >
            <MediaPlaceholder />
          </div>
        ) : (
          <div onClick={handleMediaClick} className="block w-full p-6 bg-purple-500/10 border-b border-white/5 cursor-pointer">
            <h3 className="font-bold text-xl text-themeText mb-2 leading-tight">{bookmark.title}</h3>
            <p className="text-sm text-themeMuted line-clamp-3">{bookmark.description || domainName}</p>
          </div>
        )}

        {/* Universal Mobile Footer */}
        <ActionFooter />

        {/* Action Indicators */}
        <div className={`absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-md rounded-xl p-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100`}>
          <ActionButtons />
        </div>

        {/* Desktop Hover Panel */}
        {!isMobile && (
          <div className="p-4 bg-themeCard/90 backdrop-blur-md absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col gap-3 border-t border-white/10" onClick={handleMediaClick}>
            {(effectiveMediaUrl || mediaType !== 'generic') && (
              <h4 className="font-medium text-sm text-themeText truncate cursor-pointer">{bookmark.title}</h4>
            )}
            <div className="flex items-center justify-between">
              <PriorityStars />
              <ActionButtons />
            </div>
          </div>
        )}
      </motion.div>
      <MediaTheatreOverlay />
    </>
  )
}