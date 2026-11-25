import { describe, it, expect } from "vitest"
import { formatDayLabel, formatShortDate } from "@/lib/formatDate"

describe("formatDate", () => {
  it("formats a card date", () => {
    expect(formatShortDate("2026-11-25T12:00:00Z")).toBe("Nov 25, 2026")
  })
  it("formats an analytics day label", () => {
    expect(formatDayLabel(new Date(2026, 10, 25))).toBe("Nov 25")
  })
})
