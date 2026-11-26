import { describe, it, expect } from "vitest"
import { applyRealtimeChange } from "@/lib/realtimeBookmarks"
import type { Bookmark } from "@/types/bookmark"

const mine = (id: string, extra: Partial<Bookmark> = {}): Bookmark => ({
  id,
  user_id: "u1",
  title: `t-${id}`,
  url: `https://a.test/${id}`,
  description: null,
  domain: null,
  category: null,
  priority: null,
  media_url: null,
  tags: null,
  is_archived: null,
  created_at: null,
  updated_at: null,
  ...extra,
})

describe("applyRealtimeChange", () => {
  it("ignores inserted and updated rows owned by another user", () => {
    const prev = [mine("a")]
    const foreign = { id: "z", user_id: "u2", title: "x", url: null }
    expect(applyRealtimeChange(prev, { eventType: "INSERT", new: foreign, old: {} }, "u1")).toBe(prev)
    expect(
      applyRealtimeChange(prev, { eventType: "UPDATE", new: { ...foreign, id: "a" }, old: {} }, "u1")
    ).toBe(prev)
    expect(
      applyRealtimeChange(prev, { eventType: "DELETE", new: {}, old: { id: "a", user_id: "u2" } }, "u1")
    ).toBe(prev)
  })

  it("replaces a matching optimistic row instead of adding a duplicate", () => {
    const optimistic = mine("opt-1", { title: "Same", url: "https://same.test/" })
    const prev = [optimistic, mine("a")]
    const real = mine("real-1", { title: "Same", url: "https://same.test/" })
    const next = applyRealtimeChange(prev, { eventType: "INSERT", new: real, old: {} }, "u1")
    expect(next.map((b) => b.id)).toEqual(["real-1", "a"])
  })

  it("adds a new row of the user at the top", () => {
    const prev = [mine("a")]
    const next = applyRealtimeChange(prev, { eventType: "INSERT", new: mine("b"), old: {} }, "u1")
    expect(next.map((b) => b.id)).toEqual(["b", "a"])
  })

  it("does not add a row it already has", () => {
    const prev = [mine("a")]
    expect(applyRealtimeChange(prev, { eventType: "INSERT", new: mine("a"), old: {} }, "u1")).toBe(prev)
  })

  it("replaces an updated row and ignores an unknown one", () => {
    const prev = [mine("a"), mine("b")]
    const next = applyRealtimeChange(
      prev,
      { eventType: "UPDATE", new: mine("b", { title: "new" }), old: {} },
      "u1"
    )
    expect(next[1].title).toBe("new")
    expect(applyRealtimeChange(prev, { eventType: "UPDATE", new: mine("zz"), old: {} }, "u1")).toBe(prev)
  })

  it("removes a deleted id and ignores unknown ids", () => {
    const prev = [mine("a"), mine("b")]
    const next = applyRealtimeChange(prev, { eventType: "DELETE", new: {}, old: { id: "a" } }, "u1")
    expect(next.map((b) => b.id)).toEqual(["b"])
    expect(applyRealtimeChange(prev, { eventType: "DELETE", new: {}, old: { id: "nope" } }, "u1")).toBe(prev)
    expect(applyRealtimeChange(prev, { eventType: "DELETE", new: {}, old: {} }, "u1")).toBe(prev)
  })
})
