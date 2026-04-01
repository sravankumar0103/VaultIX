const globalForRequestLocks = globalThis as typeof globalThis & {
  __vaultixRequestLocks?: Map<string, number>
}

const requestLocks =
  globalForRequestLocks.__vaultixRequestLocks ??
  (globalForRequestLocks.__vaultixRequestLocks = new Map<string, number>())

export function tryAcquireRequestLock(key: string, ttlMs = 30_000) {
  const now = Date.now()
  const expiresAt = requestLocks.get(key)

  if (expiresAt && expiresAt > now) {
    return false
  }

  requestLocks.set(key, now + ttlMs)
  return true
}

export function releaseRequestLock(key: string) {
  requestLocks.delete(key)
}
