import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Outlet } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { useEventListener } from '@/hooks/useEventListener'
import { useTheme } from '@/providers'

export function RootLayout() {
  useEventListener('vite:preloadError', () => {
    window.location.reload()
  })

  return (
    <div className="bg-color-background flex h-dvh flex-row overflow-x-hidden">
      <Suspense>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Outlet />
        </ErrorBoundary>
      </Suspense>
      <Toaster duration={3000} theme={useTheme().theme} />
    </div>
  )
}
