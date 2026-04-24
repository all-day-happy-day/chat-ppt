import { type ReactNode, useEffect, useState } from 'react'
import { createContext } from 'react'

export type Theme = 'dark' | 'light' | 'system'

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)
export { ThemeProviderContext }

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'vite-ui-theme' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme)

  useEffect(() => {
    const media: MediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = (): void => {
      const root: HTMLElement = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(theme === 'system' ? (media.matches ? 'dark' : 'light') : theme)
    }

    apply()

    if (theme !== 'system') return

    media.addEventListener('change', apply)
    return (): void => media.removeEventListener('change', apply)
  }, [theme])

  const value: ThemeProviderState = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}
