export const MEDIA_BUCKET = "media"
export const MEDIA_PUBLIC_PREFIX = "/storage/v1/object/public/media/"
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024

export type FileLike = { name: string; type: string; size: number }

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
}

const MEDIA_PATH_PATTERN = /^[A-Za-z0-9._-]{1,200}(\/[A-Za-z0-9._-]{1,200})?$/

export function getMediaPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  let pathname: string
  try {
    pathname = new URL(url).pathname
  } catch {
    return null
  }
  if (!pathname.startsWith(MEDIA_PUBLIC_PREFIX)) return null
  let path: string
  try {
    path = decodeURIComponent(pathname.slice(MEDIA_PUBLIC_PREFIX.length))
  } catch {
    return null
  }
  if (!path || path.includes("..") || path.includes("?") || path.includes("#")) return null
  return MEDIA_PATH_PATTERN.test(path) ? path : null
}

export function validateMediaFile(file: FileLike): { ok: true; ext: string } | { ok: false; message: string } {
  const allowed = file.type.startsWith("image/") || file.type.startsWith("video/") || file.type === "application/pdf"
  if (!allowed) return { ok: false, message: "Only images, videos and PDFs can be uploaded." }
  if (file.size <= 0) return { ok: false, message: "This file is empty." }
  if (file.size > MEDIA_MAX_BYTES) return { ok: false, message: "Files must be 50 MB or smaller." }
  const mapped = EXTENSIONS[file.type]
  if (mapped) return { ok: true, ext: mapped }
  const match = file.name.match(/\.([a-z0-9]{1,5})$/i)
  return { ok: true, ext: match ? match[1].toLowerCase() : "bin" }
}

export function buildMediaFileName(title: string, ext: string, randomId?: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "")
  const id = randomId ?? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
  return `${slug || "file"}-${id}.${ext}`
}
