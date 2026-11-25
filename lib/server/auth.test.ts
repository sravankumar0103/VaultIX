import { beforeEach, describe, expect, it, vi } from "vitest"

const getUser = vi.fn()

vi.mock("@/lib/server/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({ auth: { getUser } }),
}))

import { getUserFromBearer, secretsMatch } from "@/lib/server/auth"

describe("secretsMatch", () => {
  it("matches equal secrets and rejects different or missing ones", () => {
    expect(secretsMatch("abc", "abc")).toBe(true)
    expect(secretsMatch("abd", "abc")).toBe(false)
    expect(secretsMatch("abcd", "abc")).toBe(false)
    expect(secretsMatch("", "abc")).toBe(false)
    expect(secretsMatch(null, "abc")).toBe(false)
  })
})

describe("getUserFromBearer", () => {
  beforeEach(() => getUser.mockReset())

  it("returns null without a Bearer header and the user for a valid token", async () => {
    expect(await getUserFromBearer(new Request("http://x"))).toBeNull()
    expect(
      await getUserFromBearer(
        new Request("http://x", { headers: { Authorization: "Basic abc" } })
      )
    ).toBeNull()
    expect(getUser).not.toHaveBeenCalled()

    getUser.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null })
    const req = new Request("http://x", {
      headers: { Authorization: "Bearer tok" },
    })
    expect(await getUserFromBearer(req)).toEqual({ id: "u1" })
    expect(getUser).toHaveBeenCalledWith("tok")

    getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("bad") })
    expect(await getUserFromBearer(req)).toBeNull()
  })
})
