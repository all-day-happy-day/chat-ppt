import { Outlet } from 'react-router-dom'

import { CenteredLayout } from '../centered-layout/CenteredLayout'

import { Header } from './header/Header'

export function UnauthenticatedLayout() {
  return (
    <CenteredLayout>
      <Header />
      <div className="mt-8 mb-12 flex-1">
        <Outlet />
      </div>
    </CenteredLayout>
  )
}
