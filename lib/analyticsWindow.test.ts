import { describe, it, expect } from "vitest"
import { buildAnalytics, HIGH_PRIORITY, type AnalyticsRow } from "@/lib/analyticsWindow"

const NOW = new Date(2026, 10, 25, 15, 0, 0)

function row(overrides: Partial<AnalyticsRow> = {}): AnalyticsRow {
  return {
    created_at: new Date(2026, 10, 25, 9, 0, 0).toISOString(),
    priority: 1,
    category: "Tech",
    is_archived: false,
    ...overrides,
  }
}

describe("buildAnalytics", () => {
  it("starts the window at local midnight so a bookmark from early on the first day counts", () => {
    const early = new Date(2026, 10, 19, 1, 0, 0).toISOString()
    const result = buildAnalytics([row({ created_at: early })], NOW)

    expect(result.windowLabel).toBe("Last 7 days")
    expect(result.growth).toHaveLength(7)
    expect(result.growth[0]).toEqual({ name: "Nov 19", count: 1 })
    expect(result.growth[6]).toEqual({ name: "Nov 25", count: 0 })
    expect(result.stats.recent).toBe(1)
  })

  it("ignores rows without a date for the window and the buckets but counts them in the total", () => {
    const rows = [
      row({ created_at: null }),
      row({ created_at: null }),
      row({ created_at: new Date(2026, 10, 24, 12, 0, 0).toISOString() }),
    ]
    const result = buildAnalytics(rows, NOW)

    expect(result.windowLabel).toBe("Last 7 days")
    expect(result.stats.total).toBe(3)
    expect(result.stats.recent).toBe(1)
    expect(result.growth.reduce((sum, b) => sum + b.count, 0)).toBe(1)
  })

  it("picks Last 30 days when the oldest bookmark is 10 days old", () => {
    const old = new Date(2026, 10, 15, 9, 0, 0).toISOString()
    const result = buildAnalytics([row({ created_at: old })], NOW)

    expect(result.windowLabel).toBe("Last 30 days")
    expect(result.growth).toHaveLength(30)
  })

  it("counts priority 3 as high priority", () => {
    expect(HIGH_PRIORITY).toBe(3)
    const rows = [row({ priority: 3 }), row({ priority: 2 }), row({ priority: null })]

    expect(buildAnalytics(rows, NOW).stats.priority).toBe(1)
  })

  it("counts archived bookmarks in the total", () => {
    const rows = [row({ is_archived: true }), row({ is_archived: false })]

    expect(buildAnalytics(rows, NOW).stats.total).toBe(2)
  })

  it("puts rows without a category under Uncategorized", () => {
    const rows = [row({ category: null }), row({ category: "Tech" }), row({ category: null })]
    const result = buildAnalytics(rows, NOW)

    expect(result.distribution).toEqual([
      { name: "Uncategorized", value: 2 },
      { name: "Tech", value: 1 },
    ])
  })
})
