import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { User } from "@supabase/supabase-js"

const mocks = vi.hoisted(() => ({
  getUserFromBearer: vi.fn(),
  sendFeedbackEmail: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}))

vi.mock("@/lib/server/auth", () => ({ getUserFromBearer: mocks.getUserFromBearer }))
vi.mock("@/lib/accountEmails", () => ({ sendFeedbackEmail: mocks.sendFeedbackEmail }))
vi.mock("@/lib/server/supabaseAdmin", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }))

import { POST } from "./route"

const VERIFIED_USER = {
  id: "user-1",
  email: "member@example.com",
  user_metadata: { full_name: "Member Name" },
} as unknown as User // test double: the route only reads id, email and user_metadata

type Fake = {
  inserts: Record<string, unknown>[]
  filters: { eq: [string, unknown][]; gte: [string, string][] }
  tables: string[]
}

function installAdmin(options: { count?: number; insertError?: boolean; countError?: boolean } = {}) {
  const fake: Fake = { inserts: [], filters: { eq: [], gte: [] }, tables: [] }

  mocks.getSupabaseAdmin.mockReturnValue({
    from: (table: string) => {
      fake.tables.push(table)
      return {
        select: () => ({
          eq: (column: string, value: unknown) => {
            fake.filters.eq.push([column, value])
            return {
              gte: (col: string, value2: string) => {
                fake.filters.gte.push([col, value2])
                return Promise.resolve({
                  count: options.count ?? 0,
                  error: options.countError ? { message: "boom" } : null,
                })
              },
            }
          },
        }),
        insert: (row: Record<string, unknown>) => {
          fake.inserts.push(row)
          return Promise.resolve({ error: options.insertError ? { message: "boom" } : null })
        },
      }
    },
  })

  return fake
}

function request(body: unknown, token: string | null = "good-token") {
  return new Request("http://localhost/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0] // the handler only uses Request members
}

describe("POST /api/send-email", () => {
  beforeEach(() => {
    vi.stubEnv("FEEDBACK_TO_EMAIL", "feedback@example.com")
    mocks.getUserFromBearer.mockReset().mockResolvedValue(VERIFIED_USER)
    mocks.sendFeedbackEmail.mockReset().mockResolvedValue(undefined)
    mocks.getSupabaseAdmin.mockReset()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns 401 without a bearer token", async () => {
    const fake = installAdmin()
    mocks.getUserFromBearer.mockResolvedValue(null)

    const res = await POST(request({ subject: "Hi", body: "There" }, null))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
    expect(fake.inserts).toHaveLength(0)
    expect(mocks.sendFeedbackEmail).not.toHaveBeenCalled()
  })

  it("returns 400 for a body that is not a JSON object and sends nothing", async () => {
    const fake = installAdmin()

    for (const raw of ["null", "[]", "not json", '"text"']) {
      const res = await POST(request(raw))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: "Invalid request body." })
    }

    expect(fake.inserts).toHaveLength(0)
    expect(mocks.sendFeedbackEmail).not.toHaveBeenCalled()
  })

  it("refuses an empty or too long subject or message with 400", async () => {
    const fake = installAdmin()
    const cases: [unknown, string][] = [
      [{ subject: "", body: "ok" }, "Subject must be 1 to 200 characters."],
      [{ subject: "   ", body: "ok" }, "Subject must be 1 to 200 characters."],
      [{ subject: "a".repeat(201), body: "ok" }, "Subject must be 1 to 200 characters."],
      [{ subject: 5, body: "ok" }, "Subject must be 1 to 200 characters."],
      [{ subject: "ok", body: "" }, "Message must be 1 to 5000 characters."],
      [{ subject: "ok", body: "  \n " }, "Message must be 1 to 5000 characters."],
      [{ subject: "ok", body: "b".repeat(5001) }, "Message must be 1 to 5000 characters."],
      [{ subject: "ok" }, "Message must be 1 to 5000 characters."],
    ]

    for (const [payload, message] of cases) {
      const res = await POST(request(payload))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: message })
    }

    expect(fake.inserts).toHaveLength(0)
    expect(mocks.sendFeedbackEmail).not.toHaveBeenCalled()
  })

  it("accepts the maximum lengths", async () => {
    const fake = installAdmin()

    const res = await POST(request({ subject: "a".repeat(200), body: "b".repeat(5000) }))

    expect(res.status).toBe(200)
    expect(fake.inserts).toHaveLength(1)
  })

  it("stores the complaint under the verified user, never a body field", async () => {
    const fake = installAdmin()

    const res = await POST(
      request({
        subject: "  Broken save  ",
        body: "  It fails.  ",
        user_id: "other",
        userEmail: "x@evil.test",
        user_email: "y@evil.test",
        status: "resolved",
      })
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect([...new Set(fake.tables)]).toEqual(["complaints"])
    expect(fake.inserts).toEqual([
      {
        user_id: "user-1",
        user_email: "member@example.com",
        subject: "Broken save",
        body: "It fails.",
      },
    ])
    expect(fake.inserts[0]).not.toHaveProperty("status")
  })

  it("refuses a sixth report within an hour with 429", async () => {
    const fake = installAdmin({ count: 5 })

    const res = await POST(request({ subject: "Hi", body: "There" }))

    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({
      error: "Too many reports in the last hour. Please try again later.",
    })
    expect(fake.filters.eq).toEqual([["user_id", "user-1"]])
    expect(fake.filters.gte).toHaveLength(1)
    const since = Date.parse(fake.filters.gte[0][1])
    expect(Date.now() - since).toBeGreaterThan(59 * 60 * 1000)
    expect(Date.now() - since).toBeLessThan(61 * 60 * 1000)
    expect(fake.inserts).toHaveLength(0)
    expect(mocks.sendFeedbackEmail).not.toHaveBeenCalled()
  })

  it("allows a fifth report within an hour", async () => {
    const fake = installAdmin({ count: 4 })

    const res = await POST(request({ subject: "Hi", body: "There" }))

    expect(res.status).toBe(200)
    expect(fake.inserts).toHaveLength(1)
  })

  it("returns 500 and sends no email when the complaint cannot be stored", async () => {
    installAdmin({ insertError: true })

    const res = await POST(request({ subject: "Hi", body: "There" }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Internal server error" })
    expect(mocks.sendFeedbackEmail).not.toHaveBeenCalled()
  })

  it("sends to FEEDBACK_TO_EMAIL with the verified email as reply-to", async () => {
    installAdmin()

    await POST(
      request({ subject: "Broken save", body: "It fails.", userEmail: "x@evil.test", userName: "Evil" })
    )

    expect(mocks.sendFeedbackEmail).toHaveBeenCalledTimes(1)
    expect(mocks.sendFeedbackEmail).toHaveBeenCalledWith({
      to: "feedback@example.com",
      replyTo: "member@example.com",
      userName: "Member Name",
      userEmail: "member@example.com",
      subject: "Broken save",
      body: "It fails.",
    })
  })

  it("still succeeds when the email fails after the complaint is stored", async () => {
    const fake = installAdmin()
    mocks.sendFeedbackEmail.mockRejectedValue(new Error("smtp down"))

    const res = await POST(request({ subject: "Hi", body: "There" }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(fake.inserts).toHaveLength(1)
    expect(console.error).toHaveBeenCalled()
  })

  it("stores the complaint and skips the email when FEEDBACK_TO_EMAIL is missing", async () => {
    vi.stubEnv("FEEDBACK_TO_EMAIL", "")
    const fake = installAdmin()

    const res = await POST(request({ subject: "Hi", body: "There" }))

    expect(res.status).toBe(200)
    expect(fake.inserts).toHaveLength(1)
    expect(mocks.sendFeedbackEmail).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
  })
})
