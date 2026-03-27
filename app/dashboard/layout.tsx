"use client"

import Sidebar from "@/components/Sidebar"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import MobileHeader from "@/components/MobileHeader"
import MobileSidebar from "@/components/MobileSidebar"

function WelcomeCheck() {
  const router = useRouter()
  useEffect(() => {
    const checkWelcome = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push("/")
        return
      }

      // Use a user-specific session storage flag to avoid multiple calls in the same session
      const welcomeChecked = sessionStorage.getItem(`vaultix_welcome_checked_${session.user.id}`)
      if (welcomeChecked) return

      try {
        await fetch("/api/auth/welcome", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          }
        })
        sessionStorage.setItem(`vaultix_welcome_checked_${session.user.id}`, "true")
      } catch (err) {
        console.error("Welcome check failed:", err)
      }
    }

    checkWelcome()
  }, [])

  return null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-themeBg transition-colors duration-300 flex flex-col lg:flex-row h-screen overflow-hidden">
      <WelcomeCheck />
      
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
