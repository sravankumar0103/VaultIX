import type { AuthError, Session, User } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabaseClient"

const RETURNING_USER_KEY = "vaultix-returning-user"
const LAST_AUTH_USER_ID_KEY = "vaultix-last-user-id"
const DELETED_ACCOUNT_NOTICE_KEY = "vaultix-account-deleted-notice"
const AUTO_SIGN_IN_ATTEMPTED_KEY = "vaultix-auto-signin-attempted"

export type ValidatedSession =
  | { status: "signed-in"; session: Session; user: User }
  | { status: "signed-out" }
  | { status: "deleted" }

function isRefreshTokenError(message?: string) {
  if (!message) {
    return false
  }

  const normalizedMessage = message.toLowerCase()
  return normalizedMessage.includes("refresh token")
}

export function isDeletedAccountError(message?: string, code?: string) {
  if (code === "user_not_found") {
    return true
  }

  if (!message) {
    return false
  }

  const normalizedMessage = message.toLowerCase()
  return (
    normalizedMessage.includes("sub claim") &&
    normalizedMessage.includes("jwt") &&
    normalizedMessage.includes("does not exist")
  )
}

function markDeletedAccountNotice() {
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

  if (error && !isDeletedAccountError(error.message, error.code)) {
    console.error("Local sign out failed:", error)
  }
}

export async function recoverFromAuthError(message?: string, code?: string) {
  if (isDeletedAccountError(message, code)) {
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
  try {
    await clearLocalAuthSession()
  } finally {
    clearReturningUser()
    clearAutoSignInAttempt()
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

function getLastReturningUserId() {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(LAST_AUTH_USER_ID_KEY)
}

export async function validateStoredReturningUser(timeoutMs = 5000) {
  const userId = getLastReturningUserId()
  if (!userId) {
    return isReturningUser()
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch("/api/auth/account-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
      signal: controller.signal,
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
  } finally {
    clearTimeout(timer)
  }
}

export async function startGoogleSignIn(redirectTo: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  })

  return { error }
}

export async function resolveValidatedSession(): Promise<ValidatedSession> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    const recovered = await recoverFromAuthError(error.message, error.code)
    if (recovered && isDeletedAccountError(error.message, error.code)) {
      return { status: "deleted" }
    }
    if (!recovered) {
      console.error("Failed to get session:", error)
    }
    return { status: "signed-out" }
  }

  if (!data.session) {
    return { status: "signed-out" }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    const recovered = await recoverFromAuthError(userError?.message, userError?.code)
    if (!recovered) {
      await clearLocalAuthSession()
    }
    clearReturningUser()
    return isDeletedAccountError(userError?.message, userError?.code)
      ? { status: "deleted" }
      : { status: "signed-out" }
  }

  markReturningUser(userData.user.id)
  return { status: "signed-in", session: data.session, user: userData.user }
}

export function readOAuthError(search: string, hash: string) {
  const fromQuery = new URLSearchParams(search).get("error_description")
  if (fromQuery) {
    return fromQuery
  }

  return new URLSearchParams(hash.replace(/^#/, "")).get("error_description") || null
}

export function hasAttemptedAutoSignIn() {
  if (typeof window === "undefined") {
    return false
  }

  return sessionStorage.getItem(AUTO_SIGN_IN_ATTEMPTED_KEY) === "true"
}

export function markAutoSignInAttempt() {
  if (typeof window === "undefined") {
    return
  }

  sessionStorage.setItem(AUTO_SIGN_IN_ATTEMPTED_KEY, "true")
}

export function clearAutoSignInAttempt() {
  if (typeof window === "undefined") {
    return
  }

  sessionStorage.removeItem(AUTO_SIGN_IN_ATTEMPTED_KEY)
}
