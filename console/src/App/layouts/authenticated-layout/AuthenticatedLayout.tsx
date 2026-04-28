import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { Header } from './header/Header'

import type { CSSProperties } from 'react'

export function AuthenticatedLayout() {
  return (
    <Suspense>
      <main
        className="relative flex h-full w-full flex-col overflow-y-scroll"
        style={{ '--header-height': '48px' } as CSSProperties}
      >
        <Header />
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </Suspense>
  )
}
