import { describe, expect, it } from "vitest"

import { requireEnv, requireValue } from "@/lib/env"

describe("env", () => {
  it("names the missing variable", () => {
    expect(() => requireValue(undefined, "SOME_KEY")).toThrow(
      "Missing environment variable SOME_KEY"
    )
    expect(() => requireValue("", "SOME_KEY")).toThrow(
      "Missing environment variable SOME_KEY"
    )
    expect(requireValue("v", "SOME_KEY")).toBe("v")
    expect(() => requireEnv("VAULTIX_TEST_DEFINITELY_UNSET")).toThrow(
      "Missing environment variable VAULTIX_TEST_DEFINITELY_UNSET"
    )
  })
})
