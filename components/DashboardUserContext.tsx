"use client"

import { createContext, useContext } from "react"
import type { User } from "@supabase/supabase-js"

const DashboardUserContext = createContext<User | null>(null)

export function DashboardUserProvider({ user, children }: { user: User; children: React.ReactNode }) {
  return <DashboardUserContext.Provider value={user}>{children}</DashboardUserContext.Provider>
}

export function useDashboardUser(): User {
  const user = useContext(DashboardUserContext)
  if (!user) throw new Error("useDashboardUser must be used inside DashboardUserProvider")
  return user
}
