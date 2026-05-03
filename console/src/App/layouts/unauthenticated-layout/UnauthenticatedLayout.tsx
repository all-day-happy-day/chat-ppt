import { Outlet } from 'react-router-dom'

import { CenteredLayout } from '../centered-layout/CenteredLayout'

import { Header } from './header/Header'

export function UnauthenticatedLayout() {
  return (
    <CenteredLayout>
      <Header />
      <div className="scrollbar-hide mt-8 mb-12 flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overscroll-contain">
        <Outlet />
      </div>
    </CenteredLayout>
  )
}
