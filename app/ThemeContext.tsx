"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 1. Check if there's a session-specific override first
    const sessionTheme = sessionStorage.getItem("vaultix-session-theme") as Theme | null
    if (sessionTheme) {
      setTheme(sessionTheme)
      return
    }

    // 2. Otherwise fall back to the account default
    const defaultTheme = localStorage.getItem("vaultix-default-theme") as Theme | null
    if (defaultTheme) {
      setTheme(defaultTheme)
    } else {
      // Legacy fallback
      const oldTheme = localStorage.getItem("vaultix-theme") as Theme | null
      if (oldTheme) {
        setTheme(oldTheme)
      } else {
         setTheme("dark") // Ensure very first load is dark
      }
    }
  }, [])

  useEffect(() => {
    // Only apply the class; don't blindly overwrite the default theme
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === "dark" ? "light" : "dark"
      // Only persist the toggle for this session
      sessionStorage.setItem("vaultix-session-theme", newTheme)
      return newTheme
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used inside ThemeProvider")
  return context
}
