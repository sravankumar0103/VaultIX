import { normaliseHttpUrl } from "@/lib/url"
import { validateMediaFile, type FileLike } from "@/lib/mediaStorage"

export type BookmarkFormValues = {
  title: string
  url: string
  description: string
  priority: "Auto" | 1 | 2 | 3
}

export type ValidBookmarkInput = {
  title: string
  url: string | null
  description: string
  priority: "Auto" | 1 | 2 | 3
}

export function categoryFor(hasMedia: boolean, hasUrl: boolean): "URL" | "Media" | "Media+URL" {
  if (hasMedia && hasUrl) return "Media+URL"
  return hasMedia ? "Media" : "URL"
}

export function validateBookmarkSubmission(
  values: BookmarkFormValues,
  file: FileLike | null,
  opts: { existingMedia: boolean }
): { ok: true; value: ValidBookmarkInput; ext: string | null } | { ok: false; message: string } {
  const title = values.title.trim()
  if (!title) return { ok: false, message: "Add a title." }

  const rawUrl = values.url.trim()
  let url: string | null = null
  if (rawUrl) {
    url = normaliseHttpUrl(rawUrl)
    if (!url) return { ok: false, message: "Enter a web address that starts with http:// or https://." }
  }

  let ext: string | null = null
  if (file) {
    const checked = validateMediaFile(file)
    if (!checked.ok) return { ok: false, message: checked.message }
    ext = checked.ext
  }

  if (!url && !file && !opts.existingMedia) return { ok: false, message: "Add a link or upload a file." }

  return {
    ok: true,
    value: { title, url, description: values.description.trim(), priority: values.priority },
    ext,
  }
}
