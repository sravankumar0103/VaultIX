import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  signInWithOAuth: vi.fn(),
}))

vi.mock("@/lib/supabaseClient", () => ({ supabase: { auth } }))

import {
  isDeletedAccountError,
  readOAuthError,
  resolveValidatedSession,
  signOutGracefully,
  startGoogleSignIn,
  validateStoredReturningUser,
} from "@/lib/authSession"

function createStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key: string) => items.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      items.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      items.delete(key)
    }),
  }
}

let local: ReturnType<typeof createStorage>
let session: ReturnType<typeof createStorage>

beforeEach(() => {
  local = createStorage({
    "vaultix-returning-user": "true",
    "vaultix-last-user-id": "user-1",
  })
  session = createStorage({ "vaultix-auto-signin-attempted": "true" })
  vi.stubGlobal("window", {})
  vi.stubGlobal("localStorage", local)
  vi.stubGlobal("sessionStorage", session)
  auth.getSession.mockReset()
  auth.getUser.mockReset()
  auth.signOut.mockReset().mockResolvedValue({ error: null })
  auth.signInWithOAuth.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("signOutGracefully", () => {
  it("signs out with local scope and clears the returning-user flags", async () => {
    await signOutGracefully()

    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" })
    expect(local.removeItem).toHaveBeenCalledWith("vaultix-returning-user")
    expect(local.removeItem).toHaveBeenCalledWith("vaultix-last-user-id")
    expect(session.removeItem).toHaveBeenCalledWith("vaultix-auto-signin-attempted")
  })
})

describe("startGoogleSignIn", () => {
  it("returns the error when Google sign-in cannot start", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: {}, error: { message: "x" } })

    const result = await startGoogleSignIn("http://localhost/dashboard")

    expect(result.error?.message).toBe("x")
  })
})

describe("isDeletedAccountError", () => {
  it("recognises a deleted account by error code as well as by message", () => {
    expect(isDeletedAccountError(undefined, "user_not_found")).toBe(true)
    expect(isDeletedAccountError("User from sub claim in JWT does not exist")).toBe(true)
    expect(isDeletedAccountError("network error")).toBe(false)
  })
})

describe("resolveValidatedSession", () => {
  it("reports signed-out without calling getUser when there is no session", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    await expect(resolveValidatedSession()).resolves.toEqual({ status: "signed-out" })
    expect(auth.getUser).not.toHaveBeenCalled()
  })

  it("resolves a signed-in user and marks the returning flag", async () => {
    local = createStorage()
    vi.stubGlobal("localStorage", local)
    const activeSession = { access_token: "t", user: { id: "user-2" } }
    auth.getSession.mockResolvedValue({ data: { session: activeSession }, error: null })
    auth.getUser.mockResolvedValue({ data: { user: { id: "user-2" } }, error: null })

    await expect(resolveValidatedSession()).resolves.toEqual({
      status: "signed-in",
      session: activeSession,
      user: { id: "user-2" },
    })
    expect(local.setItem).toHaveBeenCalledWith("vaultix-returning-user", "true")
    expect(local.setItem).toHaveBeenCalledWith("vaultix-last-user-id", "user-2")
  })

  it("reports deleted and clears local state when getUser says the user no longer exists", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { access_token: "t", user: { id: "user-1" } } },
      error: null,
    })
    auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "User from sub claim in JWT does not exist", code: "user_not_found" },
    })

    await expect(resolveValidatedSession()).resolves.toEqual({ status: "deleted" })
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" })
    expect(local.removeItem).toHaveBeenCalledWith("vaultix-returning-user")
    expect(local.removeItem).toHaveBeenCalledWith("vaultix-last-user-id")
  })
})

describe("validateStoredReturningUser", () => {
  it("treats an account-status check that times out as a returning user", async () => {
    vi.useFakeTimers()
    vi.spyOn(console, "warn").mockImplementation(() => {})
    let signal: AbortSignal | undefined
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = validateStoredReturningUser(5000)
    await vi.advanceTimersByTimeAsync(5000)

    await expect(result).resolves.toBe(true)
    expect(signal?.aborted).toBe(true)
  })
})

describe("readOAuthError", () => {
  it("reads error_description from the query or the hash", () => {
    expect(readOAuthError("?error=access_denied&error_description=Denied", "")).toBe("Denied")
    expect(readOAuthError("", "#error_description=x")).toBe("x")
    expect(readOAuthError("", "")).toBeNull()
  })
})
