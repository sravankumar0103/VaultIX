import { beforeEach, describe, expect, it, vi } from "vitest"

const getUserById = vi.fn()

vi.mock("@/lib/server/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({ auth: { admin: { getUserById } } }),
}))

import { NextRequest } from "next/server"

import { POST } from "@/app/api/auth/account-status/route"

const USER_ID = "123e4567-e89b-42d3-a456-426614174000"

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/account-status", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

describe("POST /api/auth/account-status", () => {
  beforeEach(() => {
    getUserById.mockReset()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("answers false for a malformed id without calling Supabase", async () => {
    for (const body of [{ userId: "not-a-uuid" }, { userId: 42 }, {}, "not json"]) {
      const res = await POST(request(body))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ exists: false })
    }
    expect(getUserById).not.toHaveBeenCalled()
  })

  it("answers true when the user exists", async () => {
    getUserById.mockResolvedValueOnce({ data: { user: { id: USER_ID } }, error: null })

    const res = await POST(request({ userId: USER_ID }))

    expect(getUserById).toHaveBeenCalledWith(USER_ID)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ exists: true })
  })

  it("answers false only when Supabase says the user does not exist", async () => {
    getUserById.mockResolvedValueOnce({
      data: { user: null },
      error: { status: 404, message: "User not found" },
    })
    expect(await (await POST(request({ userId: USER_ID }))).json()).toEqual({
      exists: false,
    })

    getUserById.mockResolvedValueOnce({
      data: { user: null },
      error: { code: "user_not_found", message: "User not found" },
    })
    expect(await (await POST(request({ userId: USER_ID }))).json()).toEqual({
      exists: false,
    })
  })

  it("answers true when the lookup fails for another reason", async () => {
    getUserById.mockResolvedValueOnce({
      data: { user: null },
      error: { status: 500, message: "boom" },
    })

    const res = await POST(request({ userId: USER_ID }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ exists: true })
    expect(console.error).toHaveBeenCalled()
  })

  it("answers true when the lookup throws", async () => {
    getUserById.mockRejectedValueOnce(new Error("network"))

    const res = await POST(request({ userId: USER_ID }))

    expect(await res.json()).toEqual({ exists: true })
    expect(console.error).toHaveBeenCalled()
  })
})
