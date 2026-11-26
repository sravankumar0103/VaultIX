import { describe, expect, it } from "vitest"

import { isActivePath } from "@/lib/navItems"

describe("isActivePath", () => {
  it("marks All Bookmarks active only on /dashboard itself", () => {
    expect(isActivePath("/dashboard/priority", "/dashboard")).toBe(false)
    expect(isActivePath("/dashboard", "/dashboard")).toBe(true)
  })

  it("marks a section active on its page and its sub-pages", () => {
    expect(isActivePath("/dashboard/analytics", "/dashboard/analytics")).toBe(true)
    expect(isActivePath("/dashboard/analytics/x", "/dashboard/analytics")).toBe(true)
    expect(isActivePath("/dashboard/analyticsx", "/dashboard/analytics")).toBe(false)
  })
})
