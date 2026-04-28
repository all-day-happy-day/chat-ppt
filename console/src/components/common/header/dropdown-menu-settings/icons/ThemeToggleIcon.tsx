import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import type { Theme } from '@/providers'

export function ThemeToggleIcon({ theme }: { theme: Theme }) {
  if (theme === 'light') {
    return <SunIcon className="size-4" />
  }
  if (theme === 'dark') {
    return <MoonIcon className="size-4" />
  }
  if (theme === 'system') {
    return <MonitorIcon className="size-4" />
  }

  throw new Error(`Invalid theme: ${theme}`)
}
