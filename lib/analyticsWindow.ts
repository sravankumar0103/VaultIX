import { formatDayLabel } from "@/lib/formatDate"

export const HIGH_PRIORITY = 3

const DAY_MS = 1000 * 60 * 60 * 24

export type AnalyticsRow = {
  created_at: string | null
  priority: number | null
  category: string | null
  is_archived: boolean | null
}

export type AnalyticsSummary = {
  growth: { name: string; count: number }[]
  distribution: { name: string; value: number }[]
  stats: { total: number; priority: number; recent: number }
  windowLabel: string
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function pickWindow(daysSinceFirst: number): { windowDays: number; windowLabel: string } {
  if (daysSinceFirst > 180) return { windowDays: 365, windowLabel: "Last 12 months" }
  if (daysSinceFirst > 90) return { windowDays: 180, windowLabel: "Last 6 months" }
  if (daysSinceFirst > 30) return { windowDays: 90, windowLabel: "Last 3 months" }
  if (daysSinceFirst > 7) return { windowDays: 30, windowLabel: "Last 30 days" }
  return { windowDays: 7, windowLabel: "Last 7 days" }
}

export function buildAnalytics(rows: AnalyticsRow[], now: Date): AnalyticsSummary {
  const total = rows.length
  const priority = rows.filter(r => r.priority === HIGH_PRIORITY).length

  // Rows without a usable date count in the total and the category split only.
  const dated = rows
    .map(r => parseDate(r.created_at))
    .filter((d): d is Date => d !== null)

  const oldest = dated.reduce((min, d) => (d < min ? d : min), now)
  const daysSinceFirst = Math.max(1, Math.floor((now.getTime() - oldest.getTime()) / DAY_MS))
  const { windowDays, windowLabel } = pickWindow(daysSinceFirst)

  // The window opens at local midnight so the whole first day counts.
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - (windowDays - 1))
  windowStart.setHours(0, 0, 0, 0)

  const recent = dated.filter(d => d >= windowStart).length

  const growthMap = new Map<string, number>()
  for (let i = windowDays - 1; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    growthMap.set(formatDayLabel(day), 0)
  }
  for (const created of dated) {
    if (created < windowStart) continue
    const label = formatDayLabel(created)
    const current = growthMap.get(label)
    if (current !== undefined) growthMap.set(label, current + 1)
  }
  const growth = Array.from(growthMap, ([name, count]) => ({ name, count }))

  const distMap = new Map<string, number>()
  for (const r of rows) {
    const category = r.category || "Uncategorized"
    distMap.set(category, (distMap.get(category) ?? 0) + 1)
  }
  const distribution = Array.from(distMap, ([name, value]) => ({ name, value }))

  return { growth, distribution, stats: { total, priority, recent }, windowLabel }
}
