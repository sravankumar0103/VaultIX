import type { Bookmark } from "@/types/bookmark"
import { getMediaKind, getVideoThumbnailUrl, isDirectVideoUrl, type MediaKind } from "@/lib/mediaType"
import { getHostname, hostMatches, normaliseHttpUrl, safeHttpUrl } from "@/lib/url"

const THUMBNAIL_HOSTS = ["youtube.com", "youtu.be", "vimeo.com"]

export type ResolvedMedia = {
  /** Kind of the uploaded file, from its stored URL (never from the title or category). */
  mediaKind: MediaKind | null
  /** The uploaded file, only when it is an http(s) address. */
  fileUrl: string | null
  /** The saved link, normalised, only when it is an http(s) address. */
  linkUrl: string | null
  /** The link when it points at a video file and there is no uploaded file. */
  directVideoUrl: string | null
  /** The link when it is a YouTube or Vimeo address and there is no uploaded file. */
  thumbLinkUrl: string | null
  /** What the theatre shows: the uploaded file, else a direct video link. */
  theatreUrl: string | null
  theatreKind: "pdf" | "video" | null
  /** True when the card has something to show besides a favicon or title. */
  hasVisual: boolean
}

export function resolveMedia(bookmark: Bookmark): ResolvedMedia {
  const mediaKind = getMediaKind(bookmark.media_url)
  const fileUrl = safeHttpUrl(bookmark.media_url)
  const linkUrl = bookmark.url ? normaliseHttpUrl(bookmark.url) : null
  const hasFile = mediaKind !== null

  const directVideoUrl = !hasFile && linkUrl && isDirectVideoUrl(linkUrl) ? linkUrl : null
  const host = linkUrl ? getHostname(linkUrl) : ""
  const thumbLinkUrl =
    !hasFile && !directVideoUrl && linkUrl && THUMBNAIL_HOSTS.some((domain) => hostMatches(host, domain)) &&
    getVideoThumbnailUrl(linkUrl, false)
      ? linkUrl
      : null

  const theatreUrl = fileUrl ?? directVideoUrl
  const theatreKind = !theatreUrl
    ? null
    : fileUrl
      ? mediaKind === "pdf" || mediaKind === "video" ? mediaKind : null
      : "video"

  return {
    mediaKind,
    fileUrl,
    linkUrl,
    directVideoUrl,
    thumbLinkUrl,
    theatreUrl: theatreKind ? theatreUrl : null,
    theatreKind,
    hasVisual: hasFile || directVideoUrl !== null || thumbLinkUrl !== null,
  }
}

/** Favicon for a saved link: the app icon for VaultIX or localhost, else Google's favicon service. */
export function getFaviconUrl(linkUrl: string | null): string {
  if (!linkUrl) return ""
  const host = getHostname(linkUrl)
  if (!host) return ""
  if (host.includes("vaultix") || host.includes("localhost")) return "/vaultix-icon.png"
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
}
