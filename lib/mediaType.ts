export type MediaKind = "image" | "video" | "pdf" | "other"

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp"]
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "ogg", "m4v"]

function getExtension(url: string): string {
  let path = url
  try {
    path = new URL(url).pathname
  } catch {
    path = url.split(/[?#]/)[0]
  }
  const match = path.match(/\.([a-z0-9]+)$/i)
  return match ? match[1].toLowerCase() : ""
}

export function getMediaKind(mediaUrl: string | null | undefined): MediaKind | null {
  if (!mediaUrl) return null
  const ext = getExtension(mediaUrl)
  if (ext === "pdf") return "pdf"
  if (VIDEO_EXTENSIONS.includes(ext)) return "video"
  if (IMAGE_EXTENSIONS.includes(ext)) return "image"
  return "other"
}

export function isDirectVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return VIDEO_EXTENSIONS.includes(getExtension(url))
}

export function getVideoThumbnailUrl(url: string | null | undefined, useFallback: boolean): string | null {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i)
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/${useFallback ? "hqdefault" : "maxresdefault"}.jpg`
  }
  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/)
  if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`
  return null
}
