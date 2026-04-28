import { Outlet } from 'react-router-dom'

import { BaseHeader } from '@/components/common/header/BaseHeader'

import type { CSSProperties } from 'react'

export function UnauthenticatedLayout() {
  return (
    <main
      className="relative flex h-screen max-h-screen w-screen flex-col overflow-y-scroll"
      style={{ '--header-height': '48px' } as CSSProperties}
    >
      <BaseHeader />
      <div className="mt-8 mb-12 flex-1">
        <Outlet />
      </div>
    </main>
  )
}
