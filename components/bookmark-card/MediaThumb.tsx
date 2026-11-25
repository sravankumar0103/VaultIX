"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import type { Bookmark } from "@/types/bookmark"
import { ExternalLink, FileText, Play } from "lucide-react"
import { getVideoThumbnailUrl, type MediaKind } from "@/lib/mediaType"
import { getHostname } from "@/lib/url"
import MediaPlaceholder from "@/components/bookmark-card/MediaPlaceholder"
import VideoPreview from "@/components/bookmark-card/VideoPreview"
import PdfPreview from "@/components/bookmark-card/PdfPreview"
import { getFaviconUrl, resolveMedia } from "@/components/bookmark-card/resolveMedia"

type Props = {
  bookmark: Bookmark
  mediaKind: MediaKind | null
  variant: "card" | "list" | "moodboard"
  onOpen: () => void
}

const IMAGE_CLASSES = {
  card: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500",
  list: "w-full h-full object-cover",
  moodboard: "w-full object-cover",
} as const

// A real button laid over the tile (the tile holds previews that must not sit inside a button)
const OPEN_BUTTON_CLASSES =
  "absolute inset-0 z-10 block w-full h-full rounded-[inherit] cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-purple-500"

export default function MediaThumb({ bookmark, mediaKind, variant, onOpen }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  // The link whose maxres thumbnail failed: a different link starts again from maxres
  const [fallbackLink, setFallbackLink] = useState<string | null>(null)

  const { fileUrl, linkUrl, directVideoUrl, thumbLinkUrl, hasVisual } = resolveMedia(bookmark)
  const useFallbackThumb = thumbLinkUrl !== null && fallbackLink === thumbLinkUrl
  const openButton = (
    <button type="button" onClick={onOpen} aria-label={`Open ${bookmark.title}`} className={OPEN_BUTTON_CLASSES} />
  )
  const hasBoth = !!bookmark.media_url && !!bookmark.url
  const favicon = getFaviconUrl(linkUrl)

  // Image source: an uploaded image, else the thumbnail of a plain YouTube/Vimeo link (P18)
  const linkThumb = !mediaKind && thumbLinkUrl ? getVideoThumbnailUrl(thumbLinkUrl, useFallbackThumb) : null
  const imageSrc = mediaKind === "image" || mediaKind === "other" ? fileUrl : linkThumb
  const showImage = imageSrc !== null && failedSrc !== imageSrc

  const handleImageError = () => {
    if (!imageSrc) return
    if (!useFallbackThumb && thumbLinkUrl && imageSrc.includes("img.youtube.com")) {
      setFallbackLink(thumbLinkUrl)
    } else {
      setFailedSrc(imageSrc)
    }
  }

  const placeholderKind = mediaKind === "pdf" ? "pdf" : mediaKind === "video" || thumbLinkUrl ? "video" : "generic"

  const badge = hasBoth && showImage && (
    <span className={`absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white/80 backdrop-blur-sm opacity-0 transition-opacity ${variant === "card" ? "group-hover:opacity-100" : "group-hover/img:opacity-100"}`}>
      View Media ↗
    </span>
  )

  const image = showImage ? (
    <img
      src={imageSrc}
      alt={bookmark.title}
      className={IMAGE_CLASSES[variant]}
      loading="lazy"
      decoding="async"
      onError={handleImageError}
    />
  ) : null

  /* ---------------- list tile ---------------- */
  if (variant === "list") {
    let content: ReactNode
    if (fileUrl && mediaKind === "pdf") content = <PdfPreview src={fileUrl} title={`PDF preview: ${bookmark.title}`} />
    else if (fileUrl && mediaKind === "video") content = <VideoPreview src={fileUrl} />
    else if (image) content = image
    else if (!mediaKind && directVideoUrl) content = <VideoPreview src={directVideoUrl} />
    else if (mediaKind === "pdf") content = <FileText size={24} className="text-purple-400/80" strokeWidth={1.5} />
    else if (mediaKind === "video") content = <Play size={24} className="text-purple-400/80" strokeWidth={1.5} />
    else if (favicon) content = <img src={favicon} alt="" className="w-8 h-8 object-contain" loading="lazy" decoding="async" />
    else content = <ExternalLink size={24} className="text-themeMuted" />

    return (
      <div className="relative isolate w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
        {content}
        {openButton}
      </div>
    )
  }

  /* ---------------- card and moodboard ---------------- */
  const boxClasses = variant === "card"
    ? "relative w-full h-40 mb-5 overflow-hidden rounded-xl border border-white/5 bg-black/5 isolate group/img"
    : "relative isolate block w-full h-48 sm:h-64"

  if (hasVisual) {
    if (image) {
      return (
        <div className={variant === "card" ? boxClasses : "block w-full relative isolate group/img"}>
          {image}
          {badge}
          {openButton}
        </div>
      )
    }
    let content: ReactNode
    if (fileUrl && mediaKind === "pdf") content = <PdfPreview src={fileUrl} title={`PDF preview: ${bookmark.title}`} />
    else if (fileUrl && mediaKind === "video") content = <VideoPreview src={fileUrl} />
    else if (!mediaKind && directVideoUrl) content = <VideoPreview src={directVideoUrl} />
    else content = <MediaPlaceholder mediaType={placeholderKind} />
    return (
      <div className={boxClasses}>
        {content}
        {openButton}
      </div>
    )
  }

  /* ---------------- link only ---------------- */
  if (variant === "card") {
    const tileClasses = "w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0"
    const tile = favicon
      ? <img src={favicon} alt="" className="w-7 h-7 object-contain" loading="lazy" decoding="async" />
      : <ExternalLink size={20} className="text-themeMuted" />
    return (
      <div className="flex items-start justify-between mb-4">
        {linkUrl ? (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" aria-label="Open link" className={tileClasses}>{tile}</a>
        ) : (
          <span className={tileClasses}>{tile}</span>
        )}
      </div>
    )
  }

  return (
    <div className="relative isolate block w-full p-6 bg-purple-500/10 border-b border-white/5">
      <h3 className="font-bold text-xl text-themeText mb-2 leading-tight">{bookmark.title}</h3>
      <p className="text-sm text-themeMuted line-clamp-3">{bookmark.description || (linkUrl ? getHostname(linkUrl) : "")}</p>
      {openButton}
    </div>
  )
}
