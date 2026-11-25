import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.fn(() => ({}))

vi.mock("@supabase/supabase-js", () => ({ createClient }))

describe("supabase browser client", () => {
  beforeEach(() => {
    vi.resetModules()
    createClient.mockClear()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("creates the client with the pkce flow", async () => {
    await import("@/lib/supabaseClient")

    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.objectContaining({ auth: expect.objectContaining({ flowType: "pkce" }) })
    )
  })

  it("names the missing variable when the URL is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")

    await expect(import("@/lib/supabaseClient")).rejects.toThrow(
      "Missing environment variable NEXT_PUBLIC_SUPABASE_URL"
    )
    expect(createClient).not.toHaveBeenCalled()
  })
})
