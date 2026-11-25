import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

type Row = { media_url: string | null }
type QueryResult = { data: Row[] | null; error: { message: string } | null }
type Chain = { method: string; args: unknown[] }[]

const state = vi.hoisted(() => ({
  log: [] as string[],
  user: null as null | {
    id: string
    email?: string
    user_metadata: Record<string, unknown>
    app_metadata: Record<string, unknown>
  },
  // Answers a bookmarks or complaints query from its recorded chain.
  query: (() => ({ data: [], error: null })) as (
    table: string,
    chain: { method: string; args: unknown[] }[]
  ) => { data: { media_url: string | null }[] | null; error: { message: string } | null },
  updateUserById: [] as { id: string; attrs: unknown }[],
  updateError: null as null | { message: string },
  deleteUserError: null as null | { message: string },
  removed: [] as string[][],
  emailed: [] as { email: string; name: string }[],
}))

function fakeQuery(table: string) {
  const chain: Chain = []
  const builder = {
    then(resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) {
      const action = chain.some((step) => step.method === "delete") ? "delete" : "select"
      state.log.push(`${table}.${action}`)
      try {
        return Promise.resolve(state.query(table, chain)).then(resolve, reject)
      } catch (error) {
        return Promise.reject(error).then(resolve, reject)
      }
    },
  } as Record<string, unknown> // widened so the loop below can attach the chain methods by name
  for (const method of ["select", "delete", "eq", "neq", "or", "order", "range", "limit"]) {
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
        return { data: [], error: null }
      },
    }),
  },
  auth: {
    getUser: async (token: string) =>
      token === "good-token" && state.user
        ? { data: { user: state.user }, error: null }
        : { data: { user: null }, error: { message: "invalid" } },
    admin: {
      updateUserById: async (id: string, attrs: unknown) => {
        state.log.push("auth.updateUserById")
        state.updateUserById.push({ id, attrs })
        return { data: {}, error: state.updateUserById.length === 1 ? state.updateError : null }
      },
      deleteUser: async () => {
        state.log.push("auth.deleteUser")
        return { data: {}, error: state.deleteUserError }
      },
    },
  },
}

vi.mock("@/lib/server/supabaseAdmin", () => ({
  getSupabaseAdmin: () => fakeAdmin,
}))

vi.mock("@/lib/accountEmails", () => ({
  sendAccountDeletedEmail: async (input: { email: string; name: string }) => {
    state.log.push("email")
    state.emailed.push(input)
  },
}))

import { POST } from "@/app/api/delete-account/route"

const USER_ID = "11111111-1111-1111-1111-111111111111"
const MEDIA = "https://project.supabase.co/storage/v1/object/public/media/"

function request(token: string | null = "good-token") {
  return new NextRequest("http://localhost/api/delete-account", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

function methodArgs(chain: Chain, method: string) {
  return chain.find((step) => step.method === method)?.args
}

// Own rows answer the user's media read (eq user_id); other users' rows answer the
// reference check (neq user_id), filtered by the object names in the or() filter.
function serveRows(ownRows: Row[], otherRows: Row[] = []) {
  return (table: string, chain: Chain): QueryResult => {
    if (table !== "bookmarks" || chain.some((step) => step.method === "delete")) {
      return { data: null, error: null }
    }
    // The route always calls range(from, to) with two numbers.
    const range = methodArgs(chain, "range") as [number, number] | undefined
    const page = (rows: Row[]) => (range ? rows.slice(range[0], range[1] + 1) : rows)
    if (methodArgs(chain, "neq")) {
      const filter = String(methodArgs(chain, "or")?.[0] ?? "")
      const names = [...filter.matchAll(/%([^%]+)%/g)].map((match) => match[1])
      return {
        data: page(otherRows.filter((row) => names.some((name) => row.media_url?.includes(name)))),
        error: null,
      }
    }
    return { data: page(ownRows), error: null }
  }
}

beforeEach(() => {
  state.log = []
  state.user = {
    id: USER_ID,
    email: "user@example.com",
    user_metadata: { full_name: "Test User" },
    app_metadata: { provider: "google" },
  }
  state.query = serveRows([{ media_url: `${MEDIA}a.pdf` }, { media_url: null }])
  state.updateUserById = []
  state.updateError = null
  state.deleteUserError = null
  state.removed = []
  state.emailed = []
  vi.spyOn(console, "error").mockImplementation(() => {})
})

const CLEAR_FLAG = { app_metadata: { skip_account_deleted_email_webhook: null } }

describe("POST /api/delete-account", () => {
  it("deletes complaints, then the auth user, then bookmarks, then media, then sends the email", async () => {
    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(state.log.filter((entry) => entry !== "bookmarks.select")).toEqual([
      "auth.updateUserById",
      "complaints.delete",
      "auth.deleteUser",
      "bookmarks.delete",
      "storage.media.remove",
      "email",
    ])
    expect(state.log.indexOf("bookmarks.select")).toBeLessThan(state.log.indexOf("complaints.delete"))
    expect(state.updateUserById).toEqual([
      {
        id: USER_ID,
        attrs: { app_metadata: { provider: "google", skip_account_deleted_email_webhook: true } },
      },
    ])
    expect(state.removed).toEqual([["a.pdf"]])
    expect(state.emailed).toEqual([{ email: "user@example.com", name: "Test User" }])
  })

  it("leaves bookmarks and media untouched when the auth user delete fails", async () => {
    state.deleteUserError = { message: "boom" }

    const res = await POST(request())

    expect(res.status).toBe(500)
    expect(state.log).not.toContain("bookmarks.delete")
    expect(state.log).not.toContain("storage.media.remove")
    expect(state.log).not.toContain("email")
  })

  it("returns a generic message and clears the skip flag when the auth delete fails", async () => {
    state.deleteUserError = { message: "secret database detail" }

    const res = await POST(request())

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Account deletion failed. Please try again." })
    expect(state.updateUserById[1]).toEqual({ id: USER_ID, attrs: CLEAR_FLAG })
  })

  it("returns the generic message and clears the flag when complaints cannot be deleted", async () => {
    const serve = serveRows([{ media_url: `${MEDIA}a.pdf` }])
    state.query = (table, chain) =>
      table === "complaints" ? { data: null, error: { message: "fk detail" } } : serve(table, chain)

    const res = await POST(request())

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Account deletion failed. Please try again." })
    expect(state.log).not.toContain("auth.deleteUser")
    expect(state.updateUserById[1]).toEqual({ id: USER_ID, attrs: CLEAR_FLAG })
  })

  it("stops before deleting anything when the media list cannot be read", async () => {
    state.query = () => ({ data: null, error: { message: "read failed" } })

    const res = await POST(request())

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Failed to prepare account deletion" })
    expect(state.log.some((entry) => entry.endsWith(".delete") || entry.endsWith("deleteUser"))).toBe(false)
    expect(state.log).not.toContain("storage.media.remove")
    expect(state.updateUserById[1]).toEqual({ id: USER_ID, attrs: CLEAR_FLAG })
  })

  it("returns 500 without deleting anything when the skip flag cannot be set", async () => {
    state.updateError = { message: "metadata detail" }

    const res = await POST(request())

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Failed to prepare account deletion" })
    expect(state.log).toEqual(["auth.updateUserById"])
  })

  it("reads media paths page by page beyond 1000 rows", async () => {
    const rows = Array.from({ length: 1003 }, (_, index) => ({ media_url: `${MEDIA}file-${index}.pdf` }))
    state.query = serveRows(rows)

    const res = await POST(request())

    expect(res.status).toBe(200)
    const removed = state.removed.flat()
    expect(removed).toHaveLength(1003)
    expect(new Set(removed)).toEqual(new Set(rows.map((_, index) => `file-${index}.pdf`)))
    expect(state.removed.every((chunk) => chunk.length <= 100)).toBe(true)
  })

  it("removes an object referenced only by the deleted user", async () => {
    state.query = serveRows(
      [{ media_url: `${MEDIA}mine.pdf` }],
      [{ media_url: `${MEDIA}other-file.pdf` }]
    )

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(state.removed).toEqual([["mine.pdf"]])
  })

  it("does not remove an object that another user's bookmark also references", async () => {
    state.query = serveRows(
      [{ media_url: `${MEDIA}mine.pdf` }, { media_url: `${MEDIA}victim.pdf` }],
      [{ media_url: `${MEDIA}victim.pdf` }]
    )

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(state.removed.flat()).toEqual(["mine.pdf"])
  })

  it("removes nothing, but still succeeds, when the reference check fails", async () => {
    const serve = serveRows([{ media_url: `${MEDIA}mine.pdf` }])
    state.query = (table, chain) =>
      methodArgs(chain, "neq") ? { data: null, error: { message: "check failed" } } : serve(table, chain)

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(state.log).toContain("auth.deleteUser")
    expect(state.removed.flat()).toEqual([])
  })

  it("skips the farewell email for a user without an email address", async () => {
    state.user = { id: USER_ID, user_metadata: {}, app_metadata: {} }

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(state.log).toContain("auth.deleteUser")
    expect(state.log).not.toContain("email")
  })

  it("returns 401 without a bearer token", async () => {
    const res = await POST(request(null))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
    expect(state.log).toEqual([])
  })
})
