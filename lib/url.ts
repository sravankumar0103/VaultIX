function parseHttp(value: string): URL | null {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    if (!parsed.hostname) return null
    return parsed
  } catch {
    return null
  }
}

export function normaliseHttpUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    const parsed = parseHttp(trimmed)
    return parsed ? parsed.href : null
  }
  // No scheme: only accept something that looks like a host (has a dot, or is localhost)
  const parsed = parseHttp(`https://${trimmed}`)
  if (!parsed) return null
  if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") return null
  return parsed.href
}

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  return parseHttp(value) ? value : null
}

export function getHostname(input: string): string {
  const normalised = normaliseHttpUrl(input)
  if (!normalised) return ""
  return new URL(normalised).hostname.replace(/^www\./, "")
}

export function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith("." + domain)
}
