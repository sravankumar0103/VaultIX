import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Row = { media_url: string | null }
type QueryResult = { data: Row[] | null; error: { message: string } | null }
type Chain = { method: string; args: unknown[] }[]

const state = vi.hoisted(() => ({
  log: [] as string[],
  // Answers a bookmarks query from its recorded chain.
  query: (() => ({ data: [], error: null })) as (
    table: string,
    chain: { method: string; args: unknown[] }[]
  ) => { data: { media_url: string | null }[] | null; error: { message: string } | null },
  removeError: null as null | { message: string },
  removed: [] as string[][],
  referenceFilters: [] as string[],
  referenceExcludedUsers: [] as unknown[],
  emailed: [] as { email: string; name: string | null }[],
}))

function fakeQuery(table: string) {
  const chain: Chain = []
  const builder = {
    then(resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) {
      state.log.push(`${table}.select`)
      try {
        return Promise.resolve(state.query(table, chain)).then(resolve, reject)
      } catch (error) {
        return Promise.reject(error).then(resolve, reject)
      }
    },
  } as Record<string, unknown> // widened so the loop below can attach the chain methods by name
  for (const method of ["select", "eq", "neq", "or", "order", "range", "limit"]) {
    builder[method] = (...args: unknown[]) => {
      chain.push({ method, args })
      return builder
    }
  }
  return builder
}

const fakeAdmin = {
  from: (table: string) => fakeQuery(table),
  storage: {
    from: (bucket: string) => ({
      remove: async (paths: string[]) => {
        state.log.push(`storage.${bucket}.remove`)
        state.removed.push(paths)
        return { data: [], error: state.removeError }
      },
    }),
  },
}

vi.mock("@/lib/server/supabaseAdmin", () => ({
  getSupabaseAdmin: () => fakeAdmin,
}))

vi.mock("@/lib/accountEmails", () => ({
  sendAccountDeletedEmail: async (input: { email: string; name: string | null }) => {
    state.log.push("email")
    state.emailed.push(input)
  },
}))

import { POST } from "@/app/api/auth/account-deleted/route"

const USER_ID = "11111111-1111-1111-1111-111111111111"
const MEDIA = "https://project.supabase.co/storage/v1/object/public/media/"

function request(body: unknown, secret: string | null = "test-secret") {
  return new NextRequest("http://localhost/api/auth/account-deleted", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret === null ? {} : { "x-vaultix-webhook-secret": secret }),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

function methodArgs(chain: Chain, method: string) {
  return chain.find((step) => step.method === method)?.args
}

// The deleted user's rows are already gone (cascade), so the reference check only ever
// sees other users' rows, filtered by the object names in the or() filter.
function serveOtherRows(otherRows: Row[]) {
  return (table: string, chain: Chain): QueryResult => {
    if (table !== "bookmarks") {
      return { data: null, error: { message: `unexpected table ${table}` } }
    }
    const range = methodArgs(chain, "range") as [number, number] | undefined
    const filter = String(methodArgs(chain, "or")?.[0] ?? "")
    state.referenceFilters.push(filter)
    state.referenceExcludedUsers.push(methodArgs(chain, "neq")?.[1])
    const names = [...filter.matchAll(/%([^%]+)%/g)].map((match) => match[1])
    const rows = otherRows.filter((row) => names.some((name) => row.media_url?.includes(name)))
    return { data: range ? rows.slice(range[0], range[1] + 1) : rows, error: null }
  }
}

beforeEach(() => {
  vi.stubEnv("ACCOUNT_DELETE_WEBHOOK_SECRET", "test-secret")
  state.log = []
  state.query = serveOtherRows([])
  state.removeError = null
  state.removed = []
  state.referenceFilters = []
  state.referenceExcludedUsers = []
  state.emailed = []
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const VALID = { userId: USER_ID, email: "user@example.com", fullName: "Test User" }

describe("POST /api/auth/account-deleted", () => {
  it("rejects a wrong secret with 401", async () => {
    const wrong = await POST(request(VALID, "wrong-secret"))
    const missing = await POST(request(VALID, null))

    expect(wrong.status).toBe(401)
    expect(await wrong.json()).toEqual({ error: "Unauthorized" })
    expect(missing.status).toBe(401)
    expect(state.log).toEqual([])
  })

  it("returns 500 when the webhook secret is not configured", async () => {
    vi.stubEnv("ACCOUNT_DELETE_WEBHOOK_SECRET", "")

    const res = await POST(request(VALID))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Account delete webhook is not configured" })
    expect(state.log).toEqual([])
  })

  it("refuses a body that is not an object or has no valid email with 400", async () => {
    const bodies: unknown[] = [
      "null",
      "not json",
      [VALID],
      { email: 5 },
      { email: "no-at-sign" },
      { email: `${"a".repeat(320)}@x.io` },
      { ...VALID, fullName: "x".repeat(201) },
      { ...VALID, name: 7 },
      { ...VALID, userId: "not-a-uuid" },
      { ...VALID, mediaPaths: "a.pdf" },
    ]

    for (const body of bodies) {
      const res = await POST(request(body))
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(await res.json()).toEqual({ error: "Invalid request body." })
    }
    expect(state.log).toEqual([])
  })

  it("refuses media paths that are not plain object names", async () => {
    const res = await POST(
      request({ ...VALID, mediaPaths: ["../x", "a/b/c", "x?y", "a/../b", "", 5, "ok-1.pdf"] })
    )

    expect(res.status).toBe(200)
    expect(state.removed.flat()).toEqual(["ok-1.pdf"])
    expect(state.referenceFilters.join(",")).not.toMatch(/\.\.|a\/b\/c|x\?y/)
    expect(state.emailed).toHaveLength(1)
  })

  it("skips an invalid path individually, removes the valid ones and still sends the email (R-3)", async () => {
    const res = await POST(request({ ...VALID, mediaPaths: ["good.pdf", "../etc/passwd", "user-1/clip.mp4"] }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(state.removed.flat()).toEqual(["good.pdf", "user-1/clip.mp4"])
    expect(state.emailed).toEqual([{ email: "user@example.com", name: "Test User" }])
  })

  it("removes no media, but still sends the email, for more than 1000 paths", async () => {
    const mediaPaths = Array.from({ length: 1001 }, (_, index) => `file-${index}.pdf`)

    const res = await POST(request({ ...VALID, mediaPaths }))

    expect(res.status).toBe(200)
    expect(state.removed).toEqual([])
    expect(state.emailed).toHaveLength(1)
  })

  it("deletes the listed media and sends the deletion email after a valid secret", async () => {
    const mediaPaths = Array.from({ length: 250 }, (_, index) => `file-${index}.pdf`)

    const res = await POST(request({ ...VALID, mediaPaths }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(state.removed.length).toBeGreaterThan(2)
    expect(state.removed.every((chunk) => chunk.length <= 100)).toBe(true)
    expect(new Set(state.removed.flat())).toEqual(new Set(mediaPaths))
    expect(state.referenceExcludedUsers.every((id) => id === USER_ID)).toBe(true)
    expect(state.log.at(-1)).toBe("email")
    expect(state.emailed).toEqual([{ email: "user@example.com", name: "Test User" }])
  })

  it("uses name when fullName is absent", async () => {
    const res = await POST(request({ email: " user@example.com ", name: "Short" }))

    expect(res.status).toBe(200)
    expect(state.emailed).toEqual([{ email: "user@example.com", name: "Short" }])
  })

  it("does not remove an object that another user's bookmark references", async () => {
    state.query = serveOtherRows([{ media_url: `${MEDIA}victim.pdf` }])

    const res = await POST(request({ ...VALID, mediaPaths: ["mine.pdf", "victim.pdf"] }))

    expect(res.status).toBe(200)
    expect(state.removed.flat()).toEqual(["mine.pdf"])
    expect(state.emailed).toHaveLength(1)
  })

  it("keeps each reference-check filter short with many long object names", async () => {
    // Same shape as buildMediaFileName output: 60-char slug, "-", 8-char id, ".pdf" (74 chars).
    const names = Array.from(
      { length: 85 },
      (_, index) => `${"a-long-bookmark-title-for-a-realistic-upload-".padEnd(57, "x")}${String(index).padStart(4, "0")}-abcd1234.pdf`
    )
    expect(names[0]).toHaveLength(74)
    const sharedName = names[40]
    state.query = serveOtherRows([{ media_url: `${MEDIA}${sharedName}` }])

    const res = await POST(request({ ...VALID, mediaPaths: names }))

    expect(res.status).toBe(200)
    expect(state.referenceFilters.length).toBeGreaterThan(1)
    expect(state.referenceFilters.every((filter) => filter.length < 3500)).toBe(true)
    expect(
      state.referenceFilters.every((filter) => (filter.match(/media_url\.like/g) ?? []).length <= 20)
    ).toBe(true)
    expect(new Set(state.removed.flat())).toEqual(new Set(names.filter((name) => name !== sharedName)))
  })

  it("keeps the files, but still sends the email, when the reference query fails", async () => {
    state.query = () => ({ data: null, error: { message: "check failed" } })

    const res = await POST(request({ ...VALID, mediaPaths: ["mine.pdf"] }))

    expect(res.status).toBe(200)
    expect(state.removed.flat()).toEqual([])
    expect(state.emailed).toHaveLength(1)
  })

  it("keeps the files when the reference query throws", async () => {
    state.query = () => {
      throw new Error("network down")
    }

    const res = await POST(request({ ...VALID, mediaPaths: ["mine.pdf"] }))

    expect(res.status).toBe(200)
    expect(state.removed.flat()).toEqual([])
    expect(state.emailed).toHaveLength(1)
  })

  it("removes no media without a userId, because it cannot tell whose rows to ignore", async () => {
    const res = await POST(request({ email: "user@example.com", mediaPaths: ["mine.pdf"] }))

    expect(res.status).toBe(200)
    expect(state.log).not.toContain("bookmarks.select")
    expect(state.removed).toEqual([])
    expect(state.emailed).toHaveLength(1)
  })

  it("still sends the email when removing media fails", async () => {
    state.removeError = { message: "storage down" }

    const res = await POST(request({ ...VALID, mediaPaths: ["mine.pdf"] }))

    expect(res.status).toBe(200)
    expect(state.log).toContain("storage.media.remove")
    expect(state.emailed).toEqual([{ email: "user@example.com", name: "Test User" }])
  })
})
