import { describe, expect, it } from "vitest"
import { getHostname, hostMatches, normaliseHttpUrl, safeHttpUrl } from "@/lib/url"

describe("normaliseHttpUrl", () => {
  it("adds https when there is no scheme", () => {
    expect(normaliseHttpUrl("github.com/x")).toBe("https://github.com/x")
  })
  it("accepts an upper-case http scheme", () => {
    expect(new URL(normaliseHttpUrl("HTTP://Example.com") as string).protocol).toBe("http:")
  })
  it("rejects non-http input", () => {
    expect(normaliseHttpUrl("javascript:alert(1)")).toBeNull()
    expect(normaliseHttpUrl("ftp://x")).toBeNull()
    expect(normaliseHttpUrl("httpfoo")).toBeNull()
    expect(normaliseHttpUrl("")).toBeNull()
  })
})

describe("safeHttpUrl", () => {
  it("rejects javascript links and empty values", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull()
    expect(safeHttpUrl(null)).toBeNull()
    expect(safeHttpUrl(undefined)).toBeNull()
  })
  it("returns the value itself for http(s)", () => {
    expect(safeHttpUrl("https://a.com/x")).toBe("https://a.com/x")
  })
})

describe("getHostname", () => {
  it("strips only a leading www.", () => {
    expect(getHostname("https://awww.example.com")).toBe("awww.example.com")
    expect(getHostname("https://www.example.com")).toBe("example.com")
  })
  it("returns an empty string when unparsable", () => {
    expect(getHostname("")).toBe("")
  })
})

describe("hostMatches", () => {
  it("matches exact hosts and subdomains only", () => {
    expect(hostMatches("github.com", "github.com")).toBe(true)
    expect(hostMatches("gist.github.com", "github.com")).toBe(true)
    expect(hostMatches("notgithub.com", "github.com")).toBe(false)
  })
})
