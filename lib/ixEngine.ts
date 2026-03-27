export function runIX(url: string, title: string) {
  let domain = ""
  let category = "General"
  let importance: "Critical" | "High" | "Medium" | "Low" | "Vaulted" = "Medium"
  let tags: string[] = []

  try {
    const parsed = new URL(url)
    domain = parsed.hostname.replace("www.", "")
  } catch {
    domain = ""
  }

  // Domain-based intelligence
  if (domain.includes("github")) {
    category = "Development"
    importance = "High"
    tags.push("GitHub", "Code")
  }

  if (domain.includes("youtube")) {
    category = "Learning"
    importance = "Medium"
    tags.push("Video", "Learning")
  }

  if (domain.includes("linkedin")) {
    category = "Career"
    importance = "High"
    tags.push("Professional", "Networking")
  }

  if (domain.includes("docs.google")) {
    category = "Documentation"
    importance = "High"
    tags.push("Docs", "Work")
  }

  // Title-based tagging
  const words = title.split(" ")
  tags.push(...words.slice(0, 3))

  // Remove duplicates
  tags = [...new Set(tags)]

  return {
    domain,
    category,
    importance,
    tags,
  }
}
