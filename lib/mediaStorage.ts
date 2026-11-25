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

export function getMediaPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const idx = url.indexOf(MEDIA_PUBLIC_PREFIX)
  if (idx === -1) return null
  const path = url.slice(idx + MEDIA_PUBLIC_PREFIX.length)
  return path ? path : null
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
  const id = randomId ?? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
  return `${slug || "file"}-${id}.${ext}`
}
