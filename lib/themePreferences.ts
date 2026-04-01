export type Theme = "light" | "dark"

export const DEFAULT_THEME: Theme = "dark"
export const DEFAULT_THEME_KEY = "vaultix-default-theme"
export const SESSION_THEME_KEY = "vaultix-session-theme"
const LEGACY_THEME_KEY = "vaultix-theme"

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark"
}

export function getStoredSessionTheme(): Theme | null {
  if (typeof window === "undefined") {
    return null
  }

  const storedTheme = sessionStorage.getItem(SESSION_THEME_KEY)
  return isTheme(storedTheme) ? storedTheme : null
}

export function getStoredDefaultTheme(): Theme | null {
  if (typeof window === "undefined") {
    return null
  }

  const storedTheme = localStorage.getItem(DEFAULT_THEME_KEY)
  if (isTheme(storedTheme)) {
    return storedTheme
  }

  const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY)
  if (isTheme(legacyTheme)) {
    localStorage.setItem(DEFAULT_THEME_KEY, legacyTheme)
    localStorage.removeItem(LEGACY_THEME_KEY)
    return legacyTheme
  }

  return null
}

export function persistDefaultTheme(theme: Theme) {
  if (typeof window === "undefined") {
    return
  }

  localStorage.setItem(DEFAULT_THEME_KEY, theme)
  localStorage.removeItem(LEGACY_THEME_KEY)
}

export function persistSessionTheme(theme: Theme) {
  if (typeof window === "undefined") {
    return
  }

  sessionStorage.setItem(SESSION_THEME_KEY, theme)
}

export function clearSessionThemeOverride() {
  if (typeof window === "undefined") {
    return
  }

  sessionStorage.removeItem(SESSION_THEME_KEY)
}

export function resolveStoredTheme(): Theme {
  return getStoredSessionTheme() ?? getStoredDefaultTheme() ?? DEFAULT_THEME
}

export function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") {
    return
  }

  document.documentElement.dataset.theme = theme
  document.documentElement.classList.toggle("dark", theme === "dark")
}
