import * as React from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/providers/ThemeProvider/useTheme'

export function Toaster({ ...props }: ToasterProps): React.JSX.Element {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
