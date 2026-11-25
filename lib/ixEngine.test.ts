import { describe, expect, it } from "vitest"
import { priorityFromImportance, runIX } from "@/lib/ixEngine"
import { getHostname } from "@/lib/url"

describe("runIX", () => {
  it("derives the domain from a link without a scheme", () => {
    const ix = runIX("github.com/foo", "x")
    expect(ix.domain).toBe("github.com")
    expect(ix.importance).toBe("High")
  })
  it("strips only a leading www.", () => {
    expect(getHostname("https://awww.example.com")).toBe("awww.example.com")
  })
  it("does not treat look-alike hosts as known sites", () => {
    for (const url of ["https://notgithub.io", "https://github-phish.com"]) {
      const ix = runIX(url, "")
      expect(ix.importance).toBe("Medium")
      expect(ix.tags).not.toContain("GitHub")
    }
  })
  it("matches subdomains of a known host", () => {
    expect(runIX("https://gist.github.com", "").importance).toBe("High")
  })
  it("keeps only real words in tags", () => {
    expect(runIX("", "  The   -  React ").tags).toEqual(["The", "React"])
  })
})

describe("priorityFromImportance", () => {
  it("maps High to 3 and Medium to 2", () => {
    expect(priorityFromImportance("High")).toBe(3)
    expect(priorityFromImportance("Medium")).toBe(2)
  })
})
