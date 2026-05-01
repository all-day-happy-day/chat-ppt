import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { QueryClientProvider, ThemeProvider } from '@/providers'

import { Home } from './authenticated/home/Home'
import { ProjectListPage } from './authenticated/list-pages/ProjectListPage'
import { SongListPage } from './authenticated/list-pages/SongListPage'
import { TemplateListPage } from './authenticated/list-pages/TemplateListPage'
import { AuthenticatedLayout } from './layouts/authenticated-layout/AuthenticatedLayout'
import { RootLayout } from './layouts/root-layout/RootLayout'
import { UnauthenticatedLayout } from './layouts/unauthenticated-layout/UnauthenticatedLayout'
import { GlobalErrorPage } from './pages/global-error-page/GlobalErrorPage'
import { SignIn } from './unauthenticated/sign-in/SignIn'
import { SignUp } from './unauthenticated/sign-up/SignUp'

const IndexPage = lazy(() => import('./pages/index-page/IndexPage').then((module) => ({ default: module.IndexPage })))
const NotFoundPage = lazy(() =>
  import('./pages/not-found-page/NotFoundPage').then((module) => ({ default: module.NotFoundPage }))
)
const UserSettings = lazy(() =>
  import('./authenticated/settings/user-settings/UserSettings').then((module) => ({ default: module.UserSettings }))
)

export default function App() {
  return (
    <QueryClientProvider>
      <ThemeProvider defaultTheme="system">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<IndexPage />} />

              <Route element={<AuthenticatedLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/settings" element={<UserSettings />} />
                <Route path="/projects" element={<ProjectListPage />} />
                <Route path="/songs" element={<SongListPage />} />
                <Route path="/templates" element={<TemplateListPage />} />
              </Route>

              <Route path="/" element={<UnauthenticatedLayout />}>
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
              </Route>

              <Route path="/error" element={<GlobalErrorPage />} />
              <Route path="/*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
