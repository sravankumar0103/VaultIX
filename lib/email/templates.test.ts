import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  buildAccountDeletedEmail,
  buildFeedbackEmail,
  buildWelcomeEmail,
} from "@/lib/email/templates"

function fixture(name: string) {
  return readFileSync(
    new URL(`./__fixtures__/${name}`, import.meta.url),
    "utf8"
  ).replace(/\r\n/g, "\n")
}

describe("email templates", () => {
  it("renders each email exactly as before for a plain name", () => {
    const welcome = buildWelcomeEmail("Asha")
    expect(welcome.subject).toBe("Welcome to VaultIX, Asha!")
    expect(welcome.html).toBe(fixture("welcome-asha.html"))

    const feedback = buildFeedbackEmail({
      userName: "Asha",
      userEmail: "asha@example.com",
      subject: "Login bug",
      body: "It fails",
    })
    expect(feedback.subject).toBe("[VaultIX] Login bug")
    expect(feedback.html).toBe(fixture("feedback-asha.html"))

    const deleted = buildAccountDeletedEmail("Asha")
    expect(deleted.subject).toBe("Account Permanently Deleted - VaultIX")
    expect(deleted.html).toBe(fixture("account-deleted-asha.html"))
  })

  it("escapes markup in names, subjects and bodies", () => {
    const raw = "<b>x</b>"
    const escaped = "&lt;b&gt;x&lt;/b&gt;"

    const feedback = buildFeedbackEmail({
      userName: raw,
      userEmail: raw,
      subject: raw,
      body: raw,
    })
    expect(feedback.html).not.toContain(raw)
    expect(feedback.html).toContain(escaped)
    expect(feedback.html).toContain(`href="mailto:${escaped}"`)

    expect(buildWelcomeEmail(raw).html).not.toContain(raw)
    expect(buildWelcomeEmail(raw).html).toContain(`Hi ${escaped}!`)
    expect(buildAccountDeletedEmail(raw).html).not.toContain(raw)
    expect(buildAccountDeletedEmail(raw).html).toContain(`Hi ${escaped},`)
  })

  it("strips line breaks from subjects", () => {
    const feedback = buildFeedbackEmail({
      userName: "Asha",
      userEmail: "asha@example.com",
      subject: "Hi\r\nBcc: evil@example.com",
      body: "x",
    })
    expect(feedback.subject).toBe("[VaultIX] Hi Bcc: evil@example.com")
    expect(buildWelcomeEmail("A\nB").subject).toBe("Welcome to VaultIX, A B!")
  })
})
