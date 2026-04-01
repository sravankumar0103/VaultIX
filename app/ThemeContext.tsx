"use client"

import { createContext, useContext, useEffect, useState } from "react"
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
  resetThemeToDefault: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => resolveStoredTheme())
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const hydrationFrame = window.requestAnimationFrame(() => {
      setIsHydrated(true)
    })

    return () => window.cancelAnimationFrame(hydrationFrame)
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    applyThemeToDocument(theme)
  }, [theme, isHydrated])

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
  }

  const toggleTheme = () => {
    setThemeState((previousTheme) => {
      const nextTheme = previousTheme === "dark" ? "light" : "dark"
      persistSessionTheme(nextTheme)
      return nextTheme
    })
  }

  const setDefaultTheme = (nextTheme: Theme) => {
    persistDefaultTheme(nextTheme)
    clearSessionThemeOverride()
    setThemeState(nextTheme)
  }

  const syncThemeFromAccount = (nextTheme: Theme) => {
    persistDefaultTheme(nextTheme)

    if (!getStoredSessionTheme()) {
      setThemeState(nextTheme)
    }
  }

  const resetThemeToDefault = () => {
    clearSessionThemeOverride()
    setThemeState(resolveStoredTheme())
  }

  return (
    <ThemeContext.Provider
      value={{ theme, isHydrated, setTheme, toggleTheme, setDefaultTheme, syncThemeFromAccount, resetThemeToDefault }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used inside ThemeProvider")
  return context
}
