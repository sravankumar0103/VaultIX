import { afterEach, describe, expect, it, vi } from "vitest"

import { releaseRequestLock, tryAcquireRequestLock } from "@/lib/requestLocks"

describe("requestLocks", () => {
  afterEach(() => {
    vi.useRealTimers()
    releaseRequestLock("k")
  })

  it("refuses a second lock on the same key until it is released", () => {
    expect(tryAcquireRequestLock("k", 1000)).toBe(true)
    expect(tryAcquireRequestLock("k", 1000)).toBe(false)
    releaseRequestLock("k")
    expect(tryAcquireRequestLock("k", 1000)).toBe(true)
  })

  it("allows the key again once the time limit has passed", () => {
    vi.useFakeTimers()
    expect(tryAcquireRequestLock("k", 1000)).toBe(true)
    vi.advanceTimersByTime(1001)
    expect(tryAcquireRequestLock("k", 1000)).toBe(true)
  })
})
