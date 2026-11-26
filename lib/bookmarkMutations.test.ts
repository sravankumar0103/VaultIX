import { describe, it, expect } from "vitest"
import {
  BookmarkNotChangedError,
  createBookmarkRecord,
  deleteBookmarkRecord,
  setBookmarkArchived,
  updateBookmarkRecord,
  type BookmarkPatch,
  type DbClient,
  type NewBookmarkRow,
} from "@/lib/bookmarkMutations"

const BASE = "https://x.supabase.co/storage/v1/object/public/media/"

type Result = { data?: unknown; error?: unknown }

type Fake = {
  client: DbClient
  calls: string[]
  eqs: [string, unknown][]
  uploads: { path: string; file: unknown; options: unknown }[]
  removed: string[][]
}

// A fake client that records every call in order. `rowResult` is what the table call resolves to
// (update, delete, insert); `uploadError`/`removeError` shape the storage calls.
function makeFake(opts: {
  rowResult?: Result
  uploadError?: unknown
  removeError?: unknown
}): Fake {
  const calls: string[] = []
  const eqs: [string, unknown][] = []
  const uploads: Fake["uploads"] = []
  const removed: string[][] = []
  const rowResult: Result = opts.rowResult ?? { data: [{ id: "b1" }], error: null }

  const chain = (label: string) => {
    const c: Record<string, unknown> = {}
    c.eq = (col: string, val: unknown) => {
      eqs.push([col, val])
      return c
    }
    c.select = (cols?: string) => {
      calls.push(`${label}.select(${cols ?? ""})`)
      return c
    }
    c.single = () => Promise.resolve(rowResult)
    c.then = (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(rowResult).then(resolve, reject)
    return c
  }

  const client = {
    from: (table: string) => ({
      insert: (rows: unknown) => {
        calls.push(`insert:${table}`)
        calls.push(`insert-rows:${JSON.stringify(rows)}`)
        return chain("insert")
      },
      update: (patch: unknown) => {
        calls.push(`update:${table}`)
        calls.push(`update-patch:${JSON.stringify(patch)}`)
        return chain("update")
      },
      delete: () => {
        calls.push(`delete:${table}`)
        return chain("delete")
      },
    }),
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, file: unknown, options: unknown) => {
          calls.push(`upload:${bucket}/${path}`)
          uploads.push({ path, file, options })
          return Promise.resolve({ data: { path }, error: opts.uploadError ?? null })
        },
        remove: (paths: string[]) => {
          calls.push(`remove:${paths.join(",")}`)
          removed.push(paths)
          return Promise.resolve({ data: [], error: opts.removeError ?? null })
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `${BASE}${path}` } }),
      }),
    },
  } as unknown as DbClient

  return { client, calls, eqs, uploads, removed }
}

const file = { name: "a.pdf", type: "application/pdf", size: 10 } as unknown as File

const row: NewBookmarkRow = {
  title: "My Doc",
  url: null,
  description: "d",
  user_id: "u1",
  domain: "",
  category: "Media",
  priority: 2,
  tags: [],
}

const patch: BookmarkPatch = {
  title: "My Doc",
  url: null,
  description: "d",
  domain: "",
  category: "Media",
  priority: 2,
  tags: [],
}

const OLD_URL = `${BASE}old-file-aaaa1111.pdf`

describe("updateBookmarkRecord", () => {
  it("uploads the new file and updates the row before removing the old file", async () => {
    const fake = makeFake({})
    const result = await updateBookmarkRecord(fake.client, {
      id: "b1",
      userId: "u1",
      patch,
      oldMediaUrl: OLD_URL,
      file,
      ext: "pdf",
    })
    const order = fake.calls.filter((c) => /^(upload|update|remove):/.test(c))
    expect(order).toHaveLength(3)
    expect(order[0]).toMatch(/^upload:media\/my-doc-[a-z0-9]+\.pdf$/)
    expect(order[1]).toBe("update:bookmarks")
    expect(order[2]).toBe("remove:old-file-aaaa1111.pdf")
    expect(result.mediaUrl).toBe(`${BASE}${fake.uploads[0].path}`)
  })

  it("keeps the old file and removes the new one when the row update fails", async () => {
    const fake = makeFake({ rowResult: { data: null, error: { message: "boom" } } })
    await expect(
      updateBookmarkRecord(fake.client, {
        id: "b1",
        userId: "u1",
        patch,
        oldMediaUrl: OLD_URL,
        file,
        ext: "pdf",
      })
    ).rejects.toBeTruthy()
    expect(fake.removed).toEqual([[fake.uploads[0].path]])
    expect(fake.removed.flat()).not.toContain("old-file-aaaa1111.pdf")
  })

  it("removes the new file and fails when the update changes no row", async () => {
    const fake = makeFake({ rowResult: { data: [], error: null } })
    await expect(
      updateBookmarkRecord(fake.client, {
        id: "b1",
        userId: "u1",
        patch,
        oldMediaUrl: OLD_URL,
        file,
        ext: "pdf",
      })
    ).rejects.toBeInstanceOf(BookmarkNotChangedError)
    expect(fake.removed).toEqual([[fake.uploads[0].path]])
  })

  it("keeps the existing media url when no new file is chosen", async () => {
    const fake = makeFake({})
    const result = await updateBookmarkRecord(fake.client, {
      id: "b1",
      userId: "u1",
      patch,
      oldMediaUrl: OLD_URL,
      file: null,
      ext: null,
    })
    expect(result.mediaUrl).toBe(OLD_URL)
    expect(fake.uploads).toHaveLength(0)
    expect(fake.removed).toHaveLength(0)
  })

  it("does not fail the edit when removing the old file fails afterwards", async () => {
    const fake = makeFake({ removeError: { message: "storage down" } })
    const result = await updateBookmarkRecord(fake.client, {
      id: "b1",
      userId: "u1",
      patch,
      oldMediaUrl: OLD_URL,
      file,
      ext: "pdf",
    })
    expect(result.mediaUrl).toBe(`${BASE}${fake.uploads[0].path}`)
  })

  it("stops before touching the row when the upload fails", async () => {
    const fake = makeFake({ uploadError: { message: "too big" } })
    await expect(
      updateBookmarkRecord(fake.client, {
        id: "b1",
        userId: "u1",
        patch,
        oldMediaUrl: OLD_URL,
        file,
        ext: "pdf",
      })
    ).rejects.toBeTruthy()
    expect(fake.calls.some((c) => c.startsWith("update:"))).toBe(false)
    expect(fake.removed).toHaveLength(0)
  })

  it("scopes update and delete by id and user id and fails on zero affected rows", async () => {
    const upd = makeFake({ rowResult: { data: [], error: null } })
    await expect(
      updateBookmarkRecord(upd.client, {
        id: "b1",
        userId: "u1",
        patch,
        oldMediaUrl: null,
        file: null,
        ext: null,
      })
    ).rejects.toBeInstanceOf(BookmarkNotChangedError)
    expect(upd.eqs).toEqual([
      ["id", "b1"],
      ["user_id", "u1"],
    ])
    expect(upd.calls).toContain("update.select(id)")

    const del = makeFake({ rowResult: { data: [], error: null } })
    await expect(
      deleteBookmarkRecord(del.client, { id: "b1", userId: "u1", mediaUrl: OLD_URL })
    ).rejects.toBeInstanceOf(BookmarkNotChangedError)
    expect(del.eqs).toEqual([
      ["id", "b1"],
      ["user_id", "u1"],
    ])
    expect(del.calls).toContain("delete.select(id)")
    expect(del.removed).toHaveLength(0)
  })
})

describe("deleteBookmarkRecord", () => {
  it("deletes the row before the file and reports a storage failure", async () => {
    const fake = makeFake({ removeError: { message: "storage down" } })
    const result = await deleteBookmarkRecord(fake.client, {
      id: "b1",
      userId: "u1",
      mediaUrl: OLD_URL,
    })
    const order = fake.calls.filter((c) => /^(delete|remove):/.test(c))
    expect(order).toEqual(["delete:bookmarks", "remove:old-file-aaaa1111.pdf"])
    expect(result.storageError).toEqual({ message: "storage down" })
  })

  it("keeps the file and fails when the row delete fails", async () => {
    const fake = makeFake({ rowResult: { data: null, error: { message: "rls" } } })
    await expect(
      deleteBookmarkRecord(fake.client, { id: "b1", userId: "u1", mediaUrl: OLD_URL })
    ).rejects.toBeTruthy()
    expect(fake.removed).toHaveLength(0)
  })

  it("reports no storage error and makes no storage call without a media url", async () => {
    const fake = makeFake({})
    const result = await deleteBookmarkRecord(fake.client, { id: "b1", userId: "u1", mediaUrl: null })
    expect(result.storageError).toBeNull()
    expect(fake.removed).toHaveLength(0)
  })

  it("never removes a path that is not a plain media object name", async () => {
    const fake = makeFake({})
    const result = await deleteBookmarkRecord(fake.client, {
      id: "b1",
      userId: "u1",
      mediaUrl: `${BASE}../other/secret.png`,
    })
    expect(result.storageError).toBeNull()
    expect(fake.removed).toHaveLength(0)
  })
})

describe("createBookmarkRecord", () => {
  it("removes the uploaded file when the insert fails", async () => {
    const fake = makeFake({ rowResult: { data: null, error: { message: "insert failed" } } })
    await expect(createBookmarkRecord(fake.client, { row, file, ext: "pdf" })).rejects.toBeTruthy()
    expect(fake.removed).toEqual([[fake.uploads[0].path]])
  })

  it("inserts without an upload for a link-only bookmark", async () => {
    const created = { id: "b1", user_id: "u1", title: "My Doc", url: "https://a.test/" }
    const fake = makeFake({ rowResult: { data: created, error: null } })
    const result = await createBookmarkRecord(fake.client, {
      row: { ...row, url: "https://a.test/", category: "URL" },
      file: null,
      ext: null,
    })
    expect(result).toEqual(created)
    expect(fake.uploads).toHaveLength(0)
    expect(fake.calls.find((c) => c.startsWith("insert-rows:"))).toContain('"media_url":null')
  })

  it("stores the public url of the uploaded file on the row", async () => {
    const fake = makeFake({ rowResult: { data: { id: "b1" }, error: null } })
    await createBookmarkRecord(fake.client, { row, file, ext: "pdf" })
    const inserted = fake.calls.find((c) => c.startsWith("insert-rows:")) ?? ""
    expect(inserted).toContain(`"media_url":"${BASE}${fake.uploads[0].path}"`)
  })
})

describe("uploads", () => {
  it("uploads with the file's content type and without overwriting", async () => {
    const fake = makeFake({ rowResult: { data: { id: "b1" }, error: null } })
    await createBookmarkRecord(fake.client, { row, file, ext: "pdf" })
    expect(fake.uploads).toHaveLength(1)
    expect(fake.uploads[0].path).toMatch(/^my-doc-[a-z0-9]{8}\.pdf$/)
    expect(fake.uploads[0].file).toBe(file)
    expect(fake.uploads[0].options).toEqual({ contentType: "application/pdf", upsert: false })
  })
})

describe("setBookmarkArchived", () => {
  it("updates is_archived scoped by id and user id", async () => {
    const fake = makeFake({})
    await setBookmarkArchived(fake.client, { id: "b1", userId: "u1", archived: true })
    expect(fake.calls).toContain('update-patch:{"is_archived":true}')
    expect(fake.eqs).toEqual([
      ["id", "b1"],
      ["user_id", "u1"],
    ])
  })

  it("fails on zero affected rows and on an error", async () => {
    const none = makeFake({ rowResult: { data: [], error: null } })
    await expect(
      setBookmarkArchived(none.client, { id: "b1", userId: "u1", archived: false })
    ).rejects.toBeInstanceOf(BookmarkNotChangedError)
    const bad = makeFake({ rowResult: { data: null, error: { message: "x" } } })
    await expect(
      setBookmarkArchived(bad.client, { id: "b1", userId: "u1", archived: false })
    ).rejects.toBeTruthy()
  })
})
