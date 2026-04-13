import type { Bookmark } from "@/types/bookmark"
import { useEffect, useState } from "react"
import { ArchiveRestore, Archive, Trash2, Edit2, ExternalLink, Star } from "lucide-react"
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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const mobileActionVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  let favicon = ""

  try {
    const urlStr = bookmark.url || ""
    if (urlStr) {
      const formattedUrl = urlStr.startsWith("http")
        ? urlStr
        : `https://${urlStr}`

      const hostname = new URL(formattedUrl).hostname
      
      // Use local brand icon for VaultIX domains
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

  // When both exist: card body → URL, image → media. Otherwise existing behaviour.
  const cardLink = hasBoth
    ? (bookmark.url?.startsWith("http") ? bookmark.url : `https://${bookmark.url}`)
    : isMedia
      ? bookmark.media_url
      : bookmark.url?.startsWith("http")
        ? bookmark.url
        : bookmark.url
          ? `https://${bookmark.url}`
          : "#"

  const mediaLink = bookmark.media_url as string

  const displayDate = bookmark.created_at
    ? new Date(bookmark.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : ""

  const domainName = bookmark.url ? (() => { try { return new URL(cardLink as string).hostname.replace("www.", "") } catch { return "" } })() : ""

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


  /* ===================================================== */
  /* ===================== CARDS VIEW ==================== */
  /* ===================================================== */
  if (viewType === "cards") {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        className="group block relative rounded-2xl p-6 flex flex-col justify-between h-full bg-themeCard hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-400 border border-white/5 cursor-default"
      >
        {bookmark.media_url ? (
          <div className="relative w-full h-40 mb-5 overflow-hidden rounded-xl border border-white/5 bg-black/5">
            {hasBoth ? (
              <a
                href={mediaLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block w-full h-full relative group/img"
              >
                <img src={bookmark.media_url} alt="media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Open media ↗
                </span>
              </a>
            ) : (
              <a
                href={mediaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-full"
              >
                <img src={bookmark.media_url} alt="media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </a>
            )}
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
            <div className="absolute top-4 right-4 z-10">
              <ActionButtons />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {bookmark.media_url && (
            <div className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-md rounded-xl p-1">
              <ActionButtons />
            </div>
          )}

          <a
            href={cardLink as string}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link block"
          >
            <h3 className="font-bold text-lg leading-tight text-themeText line-clamp-2 mb-2 group-hover/link:text-purple-500 transition-colors">
              {bookmark.title}
            </h3>
          </a>

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
    )
  }

  /* ===================================================== */
  /* ===================== LIST VIEW ===================== */
  /* ===================================================== */

  if (viewType === "list") {
    return (
      <motion.div
        whileHover={{ x: 4 }}
        className="group flex flex-col sm:flex-row gap-6 items-start sm:items-center p-6 rounded-2xl bg-themeCard hover:shadow-xl transition-all border border-white/5 cursor-default"
      >
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {bookmark.media_url ? (
              <a href={mediaLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-full h-full block" title="Open media">
                <img src={bookmark.media_url} alt="media" className="w-full h-full object-cover" />
              </a>
            ) : favicon ? (
              <a href={cardLink as string} target="_blank" rel="noopener noreferrer" className="block w-8 h-8">
                <img src={favicon} alt="logo" className="w-8 h-8 object-contain" />
              </a>
            ) : (
              <a href={cardLink as string} target="_blank" rel="noopener noreferrer" className="block">
                <ExternalLink size={24} className="text-themeMuted" />
              </a>
            )}
          </div>

          <a
            href={cardLink as string}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-1 min-w-0 group/link"
          >
            <h3 className="font-bold text-lg text-themeText truncate group-hover/link:text-purple-500 transition-colors">
              {bookmark.title}
            </h3>
            <div className="flex items-center gap-3 text-sm text-themeMuted truncate">
              {domainName && <span className="truncate">{domainName}</span>}
              {domainName && <span className="w-1 h-1 rounded-full bg-gray-400/50"></span>}
              <span>{displayDate}</span>
            </div>
          </a>
        </div>

        <div className="hidden lg:block flex-1 border-l border-white/5 pl-6">
          <p className="text-sm text-themeMuted line-clamp-2">
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
    )
  }

  /* ===================================================== */
  /* ================== HEADLINES VIEW =================== */
  /* ===================================================== */
  if (viewType === "headlines") {
    return (
      <motion.div
        className="group flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-default"
      >
        <a
          href={cardLink as string}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 min-w-0 pr-4 flex-1 group/link"
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
        </a>

        <div className="flex items-center gap-6 shrink-0">
          <div className="hidden md:flex items-center gap-4">
            <span className="text-xs text-themeMuted w-24 text-right">{displayDate}</span>
            <PriorityStars />
          </div>
          <ActionButtons />
        </div>
      </motion.div>
    )
  }

  /* ===================================================== */
  /* =================== MOODBOARD VIEW ================== */
  /* ===================================================== */
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative glass rounded-2xl overflow-hidden bg-themeCard h-auto break-inside-avoid shadow-sm hover:shadow-xl transition-all duration-300"
    >
      {bookmark.media_url ? (
        <a href={mediaLink} target="_blank" rel="noopener noreferrer" className="block w-full relative group/img">
          <img src={bookmark.media_url} className="w-full object-cover" alt={bookmark.title} loading="lazy" />
          {hasBoth && (
            <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white/80 backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-opacity">
              Open media ↗
            </span>
          )}
        </a>
      ) : (
        <a href={cardLink as string} target="_blank" rel="noopener noreferrer" className="block w-full p-6 bg-purple-500/10 border-b border-white/5">
          <h3 className="font-bold text-xl text-themeText mb-2 leading-tight">{bookmark.title}</h3>
          <p className="text-sm text-themeMuted line-clamp-3">{bookmark.description || domainName}</p>
        </a>
      )}

      {/* Universal Mobile Footer (Moodboard handles title/media specially) */}
      <ActionFooter />

      {/* Desktop Hover Panel */}
      {!isMobile && (
        <div className="p-4 bg-themeCard/90 backdrop-blur-md absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col gap-3 border-t border-white/10">
          {bookmark.media_url && (
            <h4 className="font-medium text-sm text-themeText truncate">{bookmark.title}</h4>
          )}
          <div className="flex items-center justify-between">
            <PriorityStars />
            <ActionButtons />
          </div>
        </div>
      )}
    </motion.div>
  )
}