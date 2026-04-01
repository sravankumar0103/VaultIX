"use client"

import Sidebar from "@/components/Sidebar"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import MobileHeader from "@/components/MobileHeader"
import MobileSidebar from "@/components/MobileSidebar"
import { useTheme } from "@/app/ThemeContext"
import { DEFAULT_THEME, isTheme } from "@/lib/themePreferences"
import { clearLocalAuthSession, clearReturningUser, isDeletedAccountError, markReturningUser, recoverFromAuthError } from "@/lib/authSession"
import LoadingLogo from "@/components/LoadingLogo"

const welcomeRequestLocks = new Set<string>()

function SessionBootstrap() {
  const router = useRouter()
  const { isHydrated, syncThemeFromAccount } = useTheme()

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    const runWelcome = async (session: Session, attempt = 0) => {
      const checkedKey = `vaultix_welcome_checked_${session.user.id}`
      const pendingKey = `vaultix_welcome_pending_${session.user.id}`

      if (
        sessionStorage.getItem(checkedKey) ||
        sessionStorage.getItem(pendingKey) ||
        welcomeRequestLocks.has(session.user.id)
      ) {
        return
      }

      try {
        sessionStorage.setItem(pendingKey, "true")
        welcomeRequestLocks.add(session.user.id)

        const sendWelcomeRequest = async (accessToken: string) =>
          fetch("/api/auth/welcome", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })

        const getActiveAccessToken = async () => {
          const { data, error } = await supabase.auth.getSession()
          if (error) {
            const recovered = await recoverFromAuthError(error.message)
            if (!recovered) {
              console.error("Failed to get active session for welcome email:", error)
            }
            return null
          }

          return data.session?.access_token ?? session.access_token
        }

        const refreshAccessToken = async () => {
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            const recovered = await recoverFromAuthError(error.message)
            if (!recovered) {
              console.warn("Failed to refresh session for welcome email:", error)
            }
            return null
          }

          return data.session?.access_token ?? null
        }

        const accessToken = await getActiveAccessToken()
        if (!accessToken) {
          sessionStorage.removeItem(pendingKey)
          return
        }

        let response = await sendWelcomeRequest(accessToken)

        if (response.status === 401) {
          const retryAccessToken = await refreshAccessToken()
          if (!retryAccessToken) {
            sessionStorage.removeItem(pendingKey)
            return
          }

          response = await sendWelcomeRequest(retryAccessToken)
        }

        if (response.status === 401) {
          sessionStorage.removeItem(pendingKey)
          if (attempt < 2 && typeof window !== "undefined") {
            window.setTimeout(() => {
              void runWelcome(session, attempt + 1)
            }, 1200 * (attempt + 1))
          } else {
            console.warn("Skipping welcome email after repeated authorization failures.")
          }
          return
        }

        if (!response.ok) {
          throw new Error(`Welcome email request failed with status ${response.status}`)
        }

        sessionStorage.setItem(checkedKey, "true")
      } catch (err) {
        sessionStorage.removeItem(pendingKey)
        console.error("Welcome check failed:", err)
      } finally {
        welcomeRequestLocks.delete(session.user.id)
        if (sessionStorage.getItem(checkedKey)) {
          sessionStorage.removeItem(pendingKey)
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "INITIAL_SESSION") return

      if (!session) {
        router.replace("/")
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        const recovered = await recoverFromAuthError(userError?.message)
        if (recovered && isDeletedAccountError(userError?.message)) {
          router.replace("/")
          return
        }
        if (!recovered) {
          await clearLocalAuthSession()
        }
        clearReturningUser()
        router.replace("/")
        return
      }

      const themePreference = isTheme(session.user.user_metadata?.theme_preference)
        ? session.user.user_metadata.theme_preference
        : DEFAULT_THEME

      markReturningUser(userData.user.id)
      syncThemeFromAccount(themePreference)
      await runWelcome(session)
    })

    return () => subscription.unsubscribe()
  }, [isHydrated, router, syncThemeFromAccount])

  return null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isHydrated } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!isHydrated) {
    return <LoadingLogo loading delayMs={0} />
  }

  return (
    <div className="min-h-screen bg-themeBg transition-colors duration-300 flex flex-col lg:flex-row h-screen overflow-hidden">
      <SessionBootstrap />
      
      {/* Mobile Navigation */}
      <MobileHeader onOpenMenu={() => setMobileMenuOpen(true)} />
      <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:block h-full">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  )
}
