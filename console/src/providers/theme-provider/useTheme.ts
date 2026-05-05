import { useContext } from 'react'

import { ThemeProviderContext, type ThemeProviderState } from './ThemeProvider'

export function useTheme() {
  const context: ThemeProviderState = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
