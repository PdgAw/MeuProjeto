import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'neolevel:theme'
const listeners = new Set<() => void>()

/** Current theme, read from the <html> class that index.html applies before first paint. */
export function getTheme(): Theme {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#F3F6FA' : '#0E1A2B')
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* preference only */
  }
  listeners.forEach((l) => l())
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    getTheme,
    () => 'dark' as Theme,
  )
  return [theme, setTheme]
}
