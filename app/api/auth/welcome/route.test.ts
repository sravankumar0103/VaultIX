import { beforeEach, describe, expect, it, vi } from "vitest"

const { updateUserById, sendWelcomeEmail, getUserFromBearer } = vi.hoisted(() => ({
  updateUserById: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  getUserFromBearer: vi.fn(),
}))
const calls: string[] = []

vi.mock("@/lib/server/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({ auth: { admin: { updateUserById } } }),
}))
vi.mock("@/lib/server/auth", () => ({ getUserFromBearer }))
vi.mock("@/lib/accountEmails", () => ({ sendWelcomeEmail }))

import { NextRequest } from "next/server"

import { POST } from "@/app/api/auth/welcome/route"

function request() {
  return new NextRequest("http://localhost/api/auth/welcome", {
    method: "POST",
    headers: { Authorization: "Bearer tok" },
  })
}

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "ada@example.com",
    user_metadata: { full_name: "Ada Lovelace" },
    app_metadata: {},
    ...overrides,
  }
}

describe("POST /api/auth/welcome", () => {
  beforeEach(() => {
    calls.length = 0
    updateUserById.mockReset()
    sendWelcomeEmail.mockReset()
    getUserFromBearer.mockReset()
    updateUserById.mockImplementation(async (_id: string, attrs: unknown) => {
      calls.push(`update:${JSON.stringify(attrs)}`)
      return { error: null }
    })
    sendWelcomeEmail.mockImplementation(async () => {
      calls.push("send")
    })
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("answers 401 without a verified user", async () => {
    getUserFromBearer.mockResolvedValueOnce(null)

    const res = await POST(request())

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
  })

  it("sets the server-side flag before sending and sends once", async () => {
    getUserFromBearer.mockResolvedValueOnce(user())

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: "Welcome email sent" })
    expect(updateUserById).toHaveBeenCalledTimes(1)
    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      app_metadata: { welcome_sent: true },
    })
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1)
    expect(sendWelcomeEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      name: "Ada Lovelace",
    })
    expect(calls).toEqual([`update:{"app_metadata":{"welcome_sent":true}}`, "send"])
  })

  it("treats the old user_metadata flag as already sent", async () => {
    getUserFromBearer.mockResolvedValueOnce(
      user({ user_metadata: { welcome_sent: true } })
    )

    const res = await POST(request())

    expect(await res.json()).toEqual({
      success: true,
      message: "Welcome email already sent",
    })
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it("treats the app_metadata flag as already sent", async () => {
    getUserFromBearer.mockResolvedValueOnce(
      user({ app_metadata: { welcome_sent: true } })
    )

    const res = await POST(request())

    expect(await res.json()).toEqual({
      success: true,
      message: "Welcome email already sent",
    })
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it("clears the flag again when the email fails", async () => {
    getUserFromBearer.mockResolvedValueOnce(user())
    sendWelcomeEmail.mockRejectedValueOnce(new Error("smtp down"))

    const res = await POST(request())

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Internal server error" })
    expect(updateUserById).toHaveBeenCalledTimes(2)
    expect(updateUserById).toHaveBeenNthCalledWith(2, "user-1", {
      app_metadata: { welcome_sent: null },
    })
  })

  it("does not send when the flag cannot be saved", async () => {
    getUserFromBearer.mockResolvedValueOnce(user())
    updateUserById.mockResolvedValueOnce({ error: { message: "db down" } })

    const res = await POST(request())

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Internal server error" })
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
  })

  it("skips an account without an email address", async () => {
    getUserFromBearer.mockResolvedValueOnce(user({ email: undefined }))

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: "Welcome email skipped" })
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it("falls back to the plain greeting when the name is not a string", async () => {
    getUserFromBearer.mockResolvedValueOnce(
      user({ user_metadata: { full_name: { first: "Ada" }, name: 42 } })
    )

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(sendWelcomeEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      name: "there",
    })
  })
})
