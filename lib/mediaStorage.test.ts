import { describe, it, expect } from "vitest"
import { MEDIA_MAX_BYTES, buildMediaFileName, getMediaPathFromUrl, validateMediaFile } from "@/lib/mediaStorage"

const B = "https://x.supabase.co/storage/v1/object/public/media/"
const f = (name: string, type: string, size = 1024 * 1024) => ({ name, type, size })

describe("getMediaPathFromUrl", () => {
  it("extracts the object path from a public media URL and returns null for anything else", () => {
    expect(getMediaPathFromUrl("https://x.supabase.co/storage/v1/object/public/media/u1/a-b.pdf")).toBe("u1/a-b.pdf")
    expect(getMediaPathFromUrl("https://example.com/a.pdf")).toBeNull()
    expect(getMediaPathFromUrl("https://x.supabase.co/storage/v1/object/public/media/")).toBeNull()
    expect(getMediaPathFromUrl(null)).toBeNull()
    expect(getMediaPathFromUrl(undefined)).toBeNull()
  })
  it("strips the query string and fragment", () => {
    expect(getMediaPathFromUrl(`${B}a.pdf?t=1`)).toBe("a.pdf")
    expect(getMediaPathFromUrl(`${B}a.pdf#x`)).toBe("a.pdf")
  })
  it("rejects traversal, a prefix only in the query, another bucket and bad encoding", () => {
    expect(getMediaPathFromUrl(`${B}../other/x`)).toBeNull()
    expect(getMediaPathFromUrl(`${B}%2e%2e/x`)).toBeNull()
    expect(getMediaPathFromUrl("https://example.com/a?u=/storage/v1/object/public/media/a.pdf")).toBeNull()
    expect(getMediaPathFromUrl("https://x.supabase.co/storage/v1/object/public/other/a.pdf")).toBeNull()
    expect(getMediaPathFromUrl(`${B}%E0%A4%A.pdf`)).toBeNull()
    expect(getMediaPathFromUrl(`${B}a/b/c.png`)).toBeNull()
  })
  it("accepts one folder level", () => {
    expect(getMediaPathFromUrl(`${B}u1/a.png`)).toBe("u1/a.png")
  })
})

describe("buildMediaFileName", () => {
  it("slugs the title and appends the random id", () => {
    expect(buildMediaFileName("Q3 Report!", "pdf", "ab12cd34")).toBe("q3-report-ab12cd34.pdf")
  })
  it("falls back to file when the title has no usable characters", () => {
    expect(buildMediaFileName("!!!", "png", "ab12cd34")).toBe("file-ab12cd34.png")
  })
  it("caps the slug at 60 characters", () => {
    const name = buildMediaFileName("a".repeat(300), "png", "ab12cd34")
    expect(name).toBe(`${"a".repeat(60)}-ab12cd34.png`)
    expect(buildMediaFileName(`${"a".repeat(59)} b`, "png", "ab12cd34")).toBe(`${"a".repeat(59)}-ab12cd34.png`)
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
  it("falls back to bin for a long or non-alphanumeric extension", () => {
    expect(validateMediaFile(f("a.abcdefg", "image/x-weird"))).toEqual({ ok: true, ext: "bin" })
    expect(validateMediaFile(f("a.a-b", "image/x-weird"))).toEqual({ ok: true, ext: "bin" })
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
