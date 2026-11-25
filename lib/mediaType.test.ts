import { describe, expect, it } from "vitest"
import { getMediaKind, getVideoThumbnailUrl, isDirectVideoUrl } from "@/lib/mediaType"

describe("getMediaKind", () => {
  it("classifies by the path extension", () => {
    expect(getMediaKind("https://x.co/storage/v1/object/public/media/q3-report-ab12cd34.pdf")).toBe("pdf")
    expect(getMediaKind("https://x.co/a/clip.mp4?t=1")).toBe("video")
    expect(getMediaKind("https://x.co/a/pic.PNG")).toBe("image")
    expect(getMediaKind("https://x.co/a/file.bin")).toBe("other")
  })
  it("returns null for empty values", () => {
    expect(getMediaKind(null)).toBeNull()
    expect(getMediaKind(undefined)).toBeNull()
  })
})

describe("isDirectVideoUrl", () => {
  it("detects video file extensions", () => {
    expect(isDirectVideoUrl("https://x.co/a.m4v")).toBe(true)
    expect(isDirectVideoUrl("https://x.co/a.pdf")).toBe(false)
    expect(isDirectVideoUrl(null)).toBe(false)
  })
})

describe("getVideoThumbnailUrl", () => {
  it("builds YouTube thumbnails", () => {
    expect(getVideoThumbnailUrl("https://youtu.be/dQw4w9WgXcQ", false)).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg")
    expect(getVideoThumbnailUrl("https://youtu.be/dQw4w9WgXcQ", true)).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg")
  })
  it("builds Vimeo thumbnails", () => {
    expect(getVideoThumbnailUrl("https://vimeo.com/76979871", false)).toBe("https://vumbnail.com/76979871.jpg")
  })
  it("returns null for other links", () => {
    expect(getVideoThumbnailUrl("https://example.com", false)).toBeNull()
  })
})
