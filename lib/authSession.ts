import { supabase } from "@/lib/supabaseClient"

const RETURNING_USER_KEY = "vaultix-returning-user"
const LAST_AUTH_USER_ID_KEY = "vaultix-last-user-id"
const DELETED_ACCOUNT_NOTICE_KEY = "vaultix-account-deleted-notice"

function isRefreshTokenError(message?: string) {
  if (!message) {
    return false
  }

  const normalizedMessage = message.toLowerCase()
  return normalizedMessage.includes("refresh token")
}

export function isDeletedAccountError(message?: string) {
  if (!message) {
    return false
  }

  const normalizedMessage = message.toLowerCase()
  return (
    normalizedMessage.includes("user from sub claim in jwt does not exist") ||
    (normalizedMessage.includes("sub claim") &&
      normalizedMessage.includes("jwt") &&
      normalizedMessage.includes("does not exist"))
  )
}

export function markDeletedAccountNotice() {
  if (typeof window === "undefined") {
    return
  }

  sessionStorage.setItem(DELETED_ACCOUNT_NOTICE_KEY, "true")
}

export function consumeDeletedAccountNotice() {
  if (typeof window === "undefined") {
    return false
  }

  const hasNotice = sessionStorage.getItem(DELETED_ACCOUNT_NOTICE_KEY) === "true"
  if (hasNotice) {
    sessionStorage.removeItem(DELETED_ACCOUNT_NOTICE_KEY)
  }

  return hasNotice
}

export async function clearLocalAuthSession() {
  const { error } = await supabase.auth.signOut({ scope: "local" })

  if (error && !isDeletedAccountError(error.message)) {
    console.error("Local sign out failed:", error)
  }
}

export async function recoverFromAuthError(message?: string) {
  if (isDeletedAccountError(message)) {
    clearReturningUser()
    markDeletedAccountNotice()
    await clearLocalAuthSession()
    return true
  }

  if (!isRefreshTokenError(message)) {
    return false
  }

  await clearLocalAuthSession()
  return true
}

export async function signOutGracefully() {
  const { error } = await supabase.auth.signOut()

  if (!error) {
    return
  }

  const recovered = await recoverFromAuthError(error.message)
  if (!recovered) {
    console.error("Sign out failed:", error)
  }
}

export function markReturningUser(userId?: string) {
  if (typeof window === "undefined") {
    return
  }

  localStorage.setItem(RETURNING_USER_KEY, "true")
  if (userId) {
    localStorage.setItem(LAST_AUTH_USER_ID_KEY, userId)
  }
}

export function clearReturningUser() {
  if (typeof window === "undefined") {
    return
  }

  localStorage.removeItem(RETURNING_USER_KEY)
  localStorage.removeItem(LAST_AUTH_USER_ID_KEY)
}

export function isReturningUser() {
  if (typeof window === "undefined") {
    return false
  }

  return localStorage.getItem(RETURNING_USER_KEY) === "true"
}

export function getLastReturningUserId() {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(LAST_AUTH_USER_ID_KEY)
}

export async function validateStoredReturningUser() {
  const userId = getLastReturningUserId()
  if (!userId) {
    return isReturningUser()
  }

  try {
    const response = await fetch("/api/auth/account-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      return true
    }

    const body = await response.json()
    if (body?.exists === false) {
      clearReturningUser()
      return false
    }

    return true
  } catch (error) {
    console.warn("Failed to validate returning user state:", error)
    return true
  }
}

export async function startGoogleSignIn(redirectTo: string) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  })
}
