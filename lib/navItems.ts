import { Archive, BarChart3, Folder, LayoutDashboard, Star, type LucideIcon } from "lucide-react"

export type NavItem = { name: string; href: string; icon: LucideIcon }

export const NAV_ITEMS: readonly NavItem[] = [
  { name: "All Bookmarks", href: "/dashboard", icon: LayoutDashboard },
  { name: "Priority", href: "/dashboard/priority", icon: Star },
  { name: "Categories", href: "/dashboard/categories", icon: Folder },
  { name: "Archived", href: "/dashboard/archived", icon: Archive },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
]

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname === href || pathname.startsWith(href + "/")
}
