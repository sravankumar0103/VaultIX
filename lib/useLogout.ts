"use client"

import { useState } from "react"

import { signOutGracefully } from "@/lib/authSession"
import { clearSessionThemeOverride } from "@/lib/themePreferences"

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    await signOutGracefully()
    clearSessionThemeOverride()
    // Full page load on purpose: drops all in-memory state of the signed-in area.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/"
  }

  return { logout, isLoggingOut }
}
