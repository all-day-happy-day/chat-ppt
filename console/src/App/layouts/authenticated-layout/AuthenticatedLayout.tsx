import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { CenteredLayout } from '../centered-layout/CenteredLayout'

import { Header } from './header/Header'

export function AuthenticatedLayout() {
  return (
    <Suspense>
      <CenteredLayout>
        <Header />
        <div className="scrollbar-hide mt-8 mb-12 flex w-full flex-1 items-center justify-center overflow-y-scroll">
          <Outlet />
        </div>
      </CenteredLayout>
    </Suspense>
  )
}
