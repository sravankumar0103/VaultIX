"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_ITEMS, isActivePath } from "@/lib/navItems"
import { useLogout } from "@/lib/useLogout"
import LoadingLogo from "@/components/LoadingLogo"
import {
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { motion } from "framer-motion"

export default function Sidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const pathname = usePathname()
  const { logout, isLoggingOut } = useLogout()

  return (
    <>
      <LoadingLogo loading={isLoggingOut} delayMs={0} />
      <aside
        className={`
        ${collapsed ? "w-[88px]" : "w-64"}
        h-[calc(100vh-2rem)] my-4 ml-4
        bg-themeSidebar
        rounded-[2rem]
        shadow-xl shadow-black/5 dark:shadow-black/20
        border border-gray-200/50 dark:border-white/[0.05]
        transition-all duration-500 ease-[0.16,1,0.3,1]
        flex flex-col
        p-4
        relative
        z-50
      `}
    >
      {/* Logo + Toggle */}
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} pt-4 pb-6 px-2`}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <h1 className="text-xl font-bold tracking-tight text-themeText">
              Vault<span className="text-purple-500">IX</span>
            </h1>
          </motion.div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-themeMuted hover:text-themeText transition-all border border-transparent dark:border-white/5"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 mt-4">
        {NAV_ITEMS.map((item) => {
          const isActive = isActivePath(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={collapsed ? item.name : undefined}
              className={`
                group flex items-center
                ${collapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}
                rounded-2xl
                transition-all duration-300 relative overflow-hidden
                ${isActive
                  ? "text-white bg-purple-500 shadow-xl shadow-purple-500/30"
                  : "text-themeMuted hover:bg-white/5 hover:text-themeText"
                }
              `}
            >
              <item.icon
                size={collapsed ? 20 : 18}
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-all duration-300 relative z-10 ${isActive ? "text-white" : ""}`}
              />

              <span
                className={`text-sm font-medium whitespace-nowrap transition-all duration-500 relative z-10 ${collapsed
                  ? "opacity-0 translate-x-2 w-0 overflow-hidden hidden"
                  : "opacity-100 translate-x-0 w-auto tracking-wide"
                  }`}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto pt-6 pb-2 space-y-2 relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-gray-200 dark:before:bg-white/10">

        <Link
          href="/dashboard/account"
          aria-label={collapsed ? "Account" : undefined}
          className={`
            flex items-center
            ${collapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}
            rounded-2xl
            text-themeMuted
            hover:bg-gray-100 dark:hover:bg-white/5
            hover:text-themeText
            transition-all duration-300
          `}
        >
          <User size={18} />
          {!collapsed && <span className="text-sm font-medium">Account</span>}
        </Link>

        <button
          onClick={logout}
          aria-label={collapsed ? "Logout" : undefined}
          className={`
            w-full flex items-center
            ${collapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}
            rounded-2xl
            text-red-500 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-500/10
            transition-all duration-300
          `}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>

      </div>
      </aside>
    </>
  )
}
