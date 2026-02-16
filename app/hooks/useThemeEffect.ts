import { useEffect } from 'react'

const STORAGE_KEY = 'gigsync_settings'

type Theme = 'light' | 'dark' | 'auto'

function getThemeFromStorage(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'auto') {
        return parsed.theme
      }
    }
  } catch {
    // ignore parse errors
  }
  return 'auto'
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.classList.toggle('dark', isDark)
}

export function useThemeEffect() {
  useEffect(() => {
    const theme = getThemeFromStorage()
    applyTheme(theme)

    // Listen for OS preference changes (relevant when theme is 'auto')
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = () => {
      const current = getThemeFromStorage()
      if (current === 'auto') {
        applyTheme('auto')
      }
    }
    mediaQuery.addEventListener('change', handleMediaChange)

    // Listen for localStorage changes (settings updated or other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        applyTheme(getThemeFromStorage())
      }
    }
    window.addEventListener('storage', handleStorage)

    // Also poll for same-tab localStorage changes (storage event only fires cross-tab)
    const interval = setInterval(() => {
      applyTheme(getThemeFromStorage())
    }, 300)

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange)
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])
}
