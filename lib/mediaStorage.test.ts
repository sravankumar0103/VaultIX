import { describe, it, expect } from "vitest"
import { MEDIA_MAX_BYTES, buildMediaFileName, getMediaPathFromUrl, validateMediaFile } from "@/lib/mediaStorage"

const f = (name: string, type: string, size = 1024 * 1024) => ({ name, type, size })

describe("getMediaPathFromUrl", () => {
  it("extracts the object path from a public media URL and returns null for anything else", () => {
    expect(getMediaPathFromUrl("https://x.supabase.co/storage/v1/object/public/media/u1/a-b.pdf")).toBe("u1/a-b.pdf")
    expect(getMediaPathFromUrl("https://example.com/a.pdf")).toBeNull()
    expect(getMediaPathFromUrl("https://x.supabase.co/storage/v1/object/public/media/")).toBeNull()
    expect(getMediaPathFromUrl(null)).toBeNull()
    expect(getMediaPathFromUrl(undefined)).toBeNull()
  })
})

describe("buildMediaFileName", () => {
  it("slugs the title and appends the random id", () => {
    expect(buildMediaFileName("Q3 Report!", "pdf", "ab12cd34")).toBe("q3-report-ab12cd34.pdf")
  })
  it("falls back to file when the title has no usable characters", () => {
    expect(buildMediaFileName("!!!", "png", "ab12cd34")).toBe("file-ab12cd34.png")
  })
  it("generates an 8 character id by default", () => {
    expect(buildMediaFileName("a", "png")).toMatch(/^a-[0-9a-f]{8}\.png$/)
  })
})

describe("validateMediaFile", () => {
  it("maps known types to extensions", () => {
    expect(validateMediaFile(f("a.pdf", "application/pdf"))).toEqual({ ok: true, ext: "pdf" })
    expect(validateMediaFile(f("a.mov", "video/quicktime"))).toEqual({ ok: true, ext: "mov" })
    expect(validateMediaFile(f("a.jpeg", "image/jpeg"))).toEqual({ ok: true, ext: "jpg" })
  })
  it("uses the file name extension for unmapped subtypes", () => {
    expect(validateMediaFile(f("clip.MKV", "video/x-matroska"))).toEqual({ ok: true, ext: "mkv" })
  })
  it("falls back to bin", () => {
    expect(validateMediaFile(f("noext", "image/x-weird"))).toEqual({ ok: true, ext: "bin" })
  })
  it("refuses other types", () => {
    expect(validateMediaFile(f("a.exe", "application/x-msdownload"))).toEqual({
      ok: false,
      message: "Only images, videos and PDFs can be uploaded.",
    })
  })
  it("refuses oversize and empty files", () => {
    expect(validateMediaFile(f("a.png", "image/png", MEDIA_MAX_BYTES + 1))).toEqual({
      ok: false,
      message: "Files must be 50 MB or smaller.",
    })
    expect(validateMediaFile(f("a.png", "image/png", 0))).toEqual({ ok: false, message: "This file is empty." })
  })
})
