import { describe, it, expect } from "vitest"
import { categoryFor, validateBookmarkSubmission, type BookmarkFormValues } from "@/lib/bookmarkInput"

const base: BookmarkFormValues = { title: "T", url: "https://a.com", description: "", priority: "Auto" }
const none = { existingMedia: false }

describe("validateBookmarkSubmission", () => {
  it("refuses a blank title", () => {
    expect(validateBookmarkSubmission({ ...base, title: "   " }, null, none)).toEqual({ ok: false, message: "Add a title." })
  })
  it("turns an empty link into null", () => {
    const r = validateBookmarkSubmission({ ...base, url: "  " }, { name: "a.pdf", type: "application/pdf", size: 10 }, none)
    expect(r.ok && r.value.url).toBeNull()
    expect(r.ok && r.ext).toBe("pdf")
  })
  it("adds https:// to a link without a scheme", () => {
    const r = validateBookmarkSubmission({ ...base, url: "example.com" }, null, none)
    expect(r.ok && r.value.url).toBe("https://example.com/")
  })
  it("refuses javascript: and ftp: links", () => {
    const message = "Enter a web address that starts with http:// or https://."
    expect(validateBookmarkSubmission({ ...base, url: "javascript:alert(1)" }, null, none)).toEqual({ ok: false, message })
    expect(validateBookmarkSubmission({ ...base, url: "ftp://a.com/x" }, null, none)).toEqual({ ok: false, message })
  })
  it("needs a link or a file", () => {
    const v = { ...base, url: "" }
    expect(validateBookmarkSubmission(v, null, none)).toEqual({ ok: false, message: "Add a link or upload a file." })
    expect(validateBookmarkSubmission(v, null, { existingMedia: true }).ok).toBe(true)
  })
  it("refuses an unsupported file before anything is saved", () => {
    const r = validateBookmarkSubmission(base, { name: "a.exe", type: "application/x-msdownload", size: 10 }, none)
    expect(r).toEqual({ ok: false, message: "Only images, videos and PDFs can be uploaded." })
  })
})

describe("categoryFor", () => {
  it("picks the category from media and link presence", () => {
    expect(categoryFor(true, true)).toBe("Media+URL")
    expect(categoryFor(true, false)).toBe("Media")
    expect(categoryFor(false, true)).toBe("URL")
  })
})
