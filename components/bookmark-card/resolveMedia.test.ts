import { describe, expect, it } from "vitest"
import type { Bookmark } from "@/types/bookmark"
import { getFaviconUrl, resolveMedia } from "@/components/bookmark-card/resolveMedia"

function make(overrides: Partial<Bookmark>): Bookmark {
  return {
    id: "b1",
    user_id: "u1",
    title: "Untitled",
    url: null,
    description: null,
    domain: null,
    category: null,
    priority: null,
    media_url: null,
    tags: null,
    is_archived: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

const FILE = "https://x.supabase.co/storage/v1/object/public/media/"

describe("resolveMedia", () => {
  it("shows a PDF preview for an uploaded PDF whatever the title says", () => {
    const r = resolveMedia(make({ title: "Q3 Report", media_url: `${FILE}q3-ab12.pdf` }))
    expect(r.mediaKind).toBe("pdf")
    expect(r.fileUrl).toBe(`${FILE}q3-ab12.pdf`)
    expect(r.theatreKind).toBe("pdf")
    expect(r.theatreUrl).toBe(`${FILE}q3-ab12.pdf`)
    expect(r.hasVisual).toBe(true)
  })

  it("shows a video preview for an uploaded video", () => {
    const r = resolveMedia(make({ title: "Holiday", media_url: `${FILE}clip-ab12.mp4` }))
    expect(r.mediaKind).toBe("video")
    expect(r.theatreKind).toBe("video")
  })

  it("opens an uploaded image in a new tab, not the theatre", () => {
    const r = resolveMedia(make({ media_url: `${FILE}pic.png`, url: "example.com/page" }))
    expect(r.mediaKind).toBe("image")
    expect(r.theatreKind).toBeNull()
    expect(r.theatreUrl).toBeNull()
    expect(r.fileUrl).toBe(`${FILE}pic.png`)
    expect(r.linkUrl).toBe("https://example.com/page")
  })

  it("never lets a non-web media_url or url through", () => {
    const r = resolveMedia(make({ media_url: "javascript:alert(1)", url: "javascript:alert(2)" }))
    expect(r.fileUrl).toBeNull()
    expect(r.linkUrl).toBeNull()
    expect(r.theatreUrl).toBeNull()
    expect(r.hasVisual).toBe(true)
  })

  it("normalises a scheme-less legacy link", () => {
    expect(resolveMedia(make({ url: "github.com/x" })).linkUrl).toBe("https://github.com/x")
  })

  it("treats a link to a video file as a direct video when there is no upload", () => {
    const r = resolveMedia(make({ url: "https://cdn.example.com/clip.mp4" }))
    expect(r.directVideoUrl).toBe("https://cdn.example.com/clip.mp4")
    expect(r.theatreKind).toBe("video")
    expect(r.theatreUrl).toBe("https://cdn.example.com/clip.mp4")
    expect(r.hasVisual).toBe(true)
  })

  it("prefers the uploaded file over a direct video link", () => {
    const r = resolveMedia(make({ url: "https://cdn.example.com/clip.mp4", media_url: `${FILE}doc.pdf` }))
    expect(r.directVideoUrl).toBeNull()
    expect(r.theatreUrl).toBe(`${FILE}doc.pdf`)
    expect(r.theatreKind).toBe("pdf")
  })

  it("gives a plain YouTube or Vimeo link a thumbnail source (P18)", () => {
    const yt = resolveMedia(make({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }))
    expect(yt.thumbLinkUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    expect(yt.theatreUrl).toBeNull()
    expect(yt.hasVisual).toBe(true)
    expect(resolveMedia(make({ url: "https://vimeo.com/123456" })).thumbLinkUrl).not.toBeNull()
    expect(resolveMedia(make({ url: "https://youtu.be/dQw4w9WgXcQ" })).thumbLinkUrl).not.toBeNull()
  })

  it("does not take a thumbnail from a look-alike host", () => {
    expect(resolveMedia(make({ url: "https://evil.example/?u=youtu.be/dQw4w9WgXcQ" })).thumbLinkUrl).toBeNull()
    expect(resolveMedia(make({ url: "https://notyoutube.com/watch?v=dQw4w9WgXcQ" })).thumbLinkUrl).toBeNull()
  })

  it("does not use a link thumbnail when a file is uploaded", () => {
    const r = resolveMedia(make({ url: "https://youtu.be/dQw4w9WgXcQ", media_url: `${FILE}pic.png` }))
    expect(r.thumbLinkUrl).toBeNull()
  })

  it("has no visual for a plain link", () => {
    const r = resolveMedia(make({ url: "https://example.com" }))
    expect(r.hasVisual).toBe(false)
    expect(r.mediaKind).toBeNull()
    expect(r.theatreKind).toBeNull()
  })
})

describe("getFaviconUrl", () => {
  it("uses the favicon service for a normal host, without www", () => {
    expect(getFaviconUrl("https://www.example.com/a")).toBe("https://www.google.com/s2/favicons?domain=example.com&sz=128")
  })
  it("uses the app icon for VaultIX and localhost", () => {
    expect(getFaviconUrl("https://vaultix-sk.vercel.app")).toBe("/vaultix-icon.png")
    expect(getFaviconUrl("http://localhost:3000/x")).toBe("/vaultix-icon.png")
  })
  it("returns an empty string without a link", () => {
    expect(getFaviconUrl(null)).toBe("")
  })
})
