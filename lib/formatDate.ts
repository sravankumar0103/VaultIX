export function formatShortDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function formatDayLabel(value: Date): string {
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
