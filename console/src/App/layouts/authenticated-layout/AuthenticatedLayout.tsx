import { Outlet } from 'react-router-dom'

import { Header } from './header/Header'

import type { CSSProperties } from 'react'

export function AuthenticatedLayout() {
  return (
    <main
      className="relative flex h-screen max-h-screen w-screen flex-col overflow-y-scroll"
      style={{ '--header-height': '48px' } as CSSProperties}
    >
      <Header />
      <div className="mt-8 mb-12 flex-1">
        <Outlet />
      </div>
    </main>
  )
}
