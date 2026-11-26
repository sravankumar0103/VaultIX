"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import {
  applyThemeToDocument,
  clearSessionThemeOverride,
  getStoredSessionTheme,
  persistDefaultTheme,
  persistSessionTheme,
  resolveStoredTheme,
  type Theme,
} from "@/lib/themePreferences"

type ThemeContextType = {
  theme: Theme
  isHydrated: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setDefaultTheme: (theme: Theme) => void
  syncThemeFromAccount: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const subscribeNoop = () => () => {}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => resolveStoredTheme())
  // false while server rendering and hydrating, true on every client render after that
  const isHydrated = useSyncExternalStore(subscribeNoop, () => true, () => false)

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    applyThemeToDocument(theme)
  }, [theme, isHydrated])

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((previousTheme) => {
      const nextTheme = previousTheme === "dark" ? "light" : "dark"
      persistSessionTheme(nextTheme)
      return nextTheme
    })
  }, [])

  const setDefaultTheme = useCallback((nextTheme: Theme) => {
    persistDefaultTheme(nextTheme)
    clearSessionThemeOverride()
    setThemeState(nextTheme)
  }, [])

  const syncThemeFromAccount = useCallback((nextTheme: Theme) => {
    persistDefaultTheme(nextTheme)

    if (!getStoredSessionTheme()) {
      setThemeState(nextTheme)
    }
  }, [])

  const value = useMemo(
    () => ({ theme, isHydrated, setTheme, toggleTheme, setDefaultTheme, syncThemeFromAccount }),
    [theme, isHydrated, setTheme, toggleTheme, setDefaultTheme, syncThemeFromAccount],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used inside ThemeProvider")
  return context
}
