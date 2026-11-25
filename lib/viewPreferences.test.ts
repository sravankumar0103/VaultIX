import { describe, it, expect } from "vitest"
import { isSortMode, isViewMode, parseStoredViewMode } from "@/lib/viewPreferences"

describe("viewPreferences", () => {
  it("rejects unknown view modes", () => {
    expect(isViewMode("grid2")).toBe(false)
    expect(isViewMode("moodboard")).toBe(true)
  })
  it("validates sort modes", () => {
    expect(isSortMode("name-asc")).toBe(true)
    expect(isSortMode("x")).toBe(false)
  })
  it("maps the legacy grid value to cards", () => {
    expect(parseStoredViewMode("grid")).toBe("cards")
    expect(parseStoredViewMode("list")).toBe("list")
    expect(parseStoredViewMode("nope")).toBeNull()
    expect(parseStoredViewMode(null)).toBeNull()
  })
})
