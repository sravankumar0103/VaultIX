import { describe, it, expect } from "vitest"
import type { Bookmark } from "@/types/bookmark"
import { filterBookmarks, sortBookmarks } from "@/lib/filterBookmarks"

const mk = (o: Partial<Bookmark> & { id: string }): Bookmark => ({ user_id: "u", title: o.id, url: null, ...o })
const f = { mode: "all" as const, search: "", priority: "All" as const, category: "All" as const }
const ids = (l: Bookmark[]) => l.map((b) => b.id)

describe("filterBookmarks", () => {
  it("hides archived rows outside the archive", () => {
    const l = [mk({ id: "a" }), mk({ id: "b", is_archived: true })]
    expect(ids(filterBookmarks(l, f))).toEqual(["a"])
    expect(ids(filterBookmarks(l, { ...f, mode: "archived" }))).toEqual(["b"])
  })
  it("shows Media+URL rows under URL and under Media", () => {
    const l = [mk({ id: "u", category: "URL" }), mk({ id: "m", category: "Media" }), mk({ id: "mu", category: "Media+URL" })]
    expect(ids(filterBookmarks(l, { ...f, category: "URL" }))).toEqual(["u", "mu"])
    expect(ids(filterBookmarks(l, { ...f, category: "Media" }))).toEqual(["m", "mu"])
  })
  it("shows legacy categories only under All", () => {
    const l = [mk({ id: "x", category: "Tech" })]
    expect(ids(filterBookmarks(l, f))).toEqual(["x"])
    expect(filterBookmarks(l, { ...f, category: "URL" })).toEqual([])
    expect(filterBookmarks(l, { ...f, category: "Media" })).toEqual([])
  })
  it("searches title, domain, category and tags only", () => {
    const l = [
      mk({ id: "t", title: "Alpha" }),
      mk({ id: "d", domain: "alpha.com" }),
      mk({ id: "c", category: "alpha" }),
      mk({ id: "g", tags: ["xALPHAx"] }),
      mk({ id: "desc", title: "zzz", description: "alpha", url: "https://alpha.com" }),
    ]
    expect(ids(filterBookmarks(l, { ...f, search: "ALPHA" }))).toEqual(["t", "d", "c", "g"])
  })
  it("filters the priority page by exact stars and hides archived", () => {
    const l = [
      mk({ id: "p0" }),
      mk({ id: "p1", priority: 1 }),
      mk({ id: "p3", priority: 3 }),
      mk({ id: "p3a", priority: 3, is_archived: true }),
    ]
    expect(ids(filterBookmarks(l, { ...f, mode: "priority" }))).toEqual(["p1", "p3"])
    expect(ids(filterBookmarks(l, { ...f, mode: "priority", priority: 3 }))).toEqual(["p3"])
  })
})

describe("sortBookmarks", () => {
  it("sorts rows without a date last when newest first", () => {
    const l = [mk({ id: "none" }), mk({ id: "old", created_at: "2026-01-01T00:00:00Z" }), mk({ id: "new", created_at: "2026-06-01T00:00:00Z" })]
    expect(ids(sortBookmarks(l, "date-desc"))).toEqual(["new", "old", "none"])
  })
  it("sorts by name and does not mutate the input", () => {
    const l = [mk({ id: "b", title: "b" }), mk({ id: "A", title: "A" })]
    expect(ids(sortBookmarks(l, "name-asc"))).toEqual(["A", "b"])
    expect(ids(sortBookmarks(l, "name-desc"))).toEqual(["b", "A"])
    expect(ids(l)).toEqual(["b", "A"])
  })
})
