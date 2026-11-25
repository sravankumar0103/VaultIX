import { describe, expect, it } from "vitest"

import { isUuid, jsonError, readJsonObject } from "@/lib/server/http"

function jsonRequest(body: string) {
  return new Request("http://x", { method: "POST", body })
}

describe("readJsonObject", () => {
  it("returns null for bad JSON, arrays and null", async () => {
    expect(await readJsonObject(jsonRequest("{nope"))).toBeNull()
    expect(await readJsonObject(jsonRequest("[1]"))).toBeNull()
    expect(await readJsonObject(jsonRequest("null"))).toBeNull()
    expect(await readJsonObject(jsonRequest("3"))).toBeNull()
    expect(await readJsonObject(jsonRequest('{"a":1}'))).toEqual({ a: 1 })
  })
})

describe("isUuid", () => {
  it("accepts only canonical UUIDs", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true)
    expect(isUuid("123E4567-E89B-12D3-A456-426614174000")).toBe(true)
    expect(isUuid("123e4567e89b12d3a456426614174000")).toBe(false)
    expect(isUuid(" 123e4567-e89b-12d3-a456-426614174000")).toBe(false)
    expect(isUuid("not-a-uuid")).toBe(false)
    expect(isUuid(5)).toBe(false)
    expect(isUuid(null)).toBe(false)
  })
})

describe("jsonError", () => {
  it("wraps the message in { error }", async () => {
    const res = jsonError(401, "Unauthorized")
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
  })
})
