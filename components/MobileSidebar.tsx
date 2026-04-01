"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOutGracefully } from "@/lib/authSession"
import { clearSessionThemeOverride } from "@/lib/themePreferences"
import {
  LayoutDashboard,
  Star,
  Folder,
  Archive,
  BarChart3,
  User,
  LogOut,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import LoadingLogo from "@/components/LoadingLogo"

export default function MobileSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const navItems = [
    { name: "All Bookmarks", href: "/dashboard", icon: LayoutDashboard },
    { name: "Priority", href: "/dashboard/priority", icon: Star },
    { name: "Categories", href: "/dashboard/categories", icon: Folder },
    { name: "Archived", href: "/dashboard/archived", icon: Archive },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  ]

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    await signOutGracefully()
    clearSessionThemeOverride()
    window.location.href = "/"
  }

  return (
    <>
      <LoadingLogo loading={isLoggingOut} delayMs={0} />
      <AnimatePresence>
        {isOpen && (
          <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          />

          {/* Sidebar Drawer */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[280px] bg-themeSidebar z-[70] lg:hidden shadow-2xl flex flex-col p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl font-bold tracking-tight text-themeText">
                Vault<span className="text-purple-500">IX</span>
              </h1>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 border border-white/5 text-themeMuted hover:text-themeText transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(item.href + "/")

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300
                      ${isActive
                        ? "text-white bg-purple-500 shadow-xl shadow-purple-500/30 font-semibold"
                        : "text-themeMuted hover:bg-white/5 hover:text-themeText"
                      }
                    `}
                  >
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
              <Link
                href="/dashboard/account"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-themeMuted hover:bg-white/5 hover:text-themeText transition-all"
              >
                <User size={20} />
                <span className="text-sm font-medium">Account Settings</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all font-medium"
              >
                <LogOut size={20} />
                <span className="text-sm">Log out</span>
              </button>
            </div>
          </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
