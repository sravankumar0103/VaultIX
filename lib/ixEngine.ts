import { getHostname, hostMatches } from "@/lib/url"

type Importance = "High" | "Medium"

export function runIX(url: string, title: string): { domain: string; importance: Importance; tags: string[] } {
  const domain = getHostname(url)
  let importance: Importance = "Medium"
  const tags: string[] = []

  // Domain-based intelligence
  if (hostMatches(domain, "github.com")) {
    importance = "High"
    tags.push("GitHub", "Code")
  }

  if (hostMatches(domain, "youtube.com")) {
    importance = "Medium"
    tags.push("Video", "Learning")
  }

  if (hostMatches(domain, "linkedin.com")) {
    importance = "High"
    tags.push("Professional", "Networking")
  }

  if (hostMatches(domain, "docs.google.com")) {
    importance = "High"
    tags.push("Docs", "Work")
  }

  // Title-based tagging: first three real words
  const words = title
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean)
  tags.push(...words.slice(0, 3))

  const seen = new Set<string>()
  const unique = tags.filter((tag) => {
    const key = tag.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { domain, importance, tags: unique }
}

export function priorityFromImportance(importance: Importance): 1 | 2 | 3 {
  return importance === "High" ? 3 : 2
}
