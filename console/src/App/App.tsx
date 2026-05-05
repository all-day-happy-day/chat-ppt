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
const ManageUser = lazy(() =>
  import('./authenticated/settings/manage-users/ManageUser').then((module) => ({ default: module.ManageUser }))
)
const SongEditPage = lazy(() =>
  import('./authenticated/song-edit/SongEditPage').then((module) => ({ default: module.SongEditPage }))
)
const SongNewPage = lazy(() =>
  import('./authenticated/song/SongNewPage').then((module) => ({ default: module.SongNewPage }))
)
const TemplateNewPage = lazy(() =>
  import('./authenticated/template/TemplateNewPage').then((module) => ({ default: module.TemplateNewPage }))
)
const TemplateEditPage = lazy(() =>
  import('./authenticated/template/TemplateEditPage').then((module) => ({ default: module.TemplateEditPage }))
)
const ProjectContainerViewPage = lazy(() =>
  import('./authenticated/project-view/ProjectViewPage').then((module) => ({
    default: module.ProjectContainerViewPage,
  }))
)
const ProjectContainerListPage = lazy(() =>
  import('./authenticated/project-view/ProjectViewPage').then((module) => ({
    default: module.ProjectContainerListPage,
  }))
)
const ProjectNewPage = lazy(() =>
  import('./authenticated/project/ProjectNewPage').then((module) => ({ default: module.ProjectNewPage }))
)
const ProjectViewPage = lazy(() =>
  import('./authenticated/project-view/ProjectViewPage').then((module) => ({ default: module.ProjectViewPage }))
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
                <Route path="/settings/users" element={<ManageUser />} />
                <Route path="/projects" element={<ProjectListPage />} />
                <Route path="/projects/new" element={<ProjectNewPage />} />
                <Route path="/projects/:projectId/containers" element={<ProjectContainerListPage />} />
                <Route path="/projects/:projectId/containers/:containerId" element={<ProjectContainerViewPage />} />
                <Route path="/projects/:projectId" element={<ProjectViewPage />} />
                <Route path="/songs" element={<SongListPage />} />
                <Route path="/songs/new" element={<SongNewPage />} />
                <Route path="/songs/:songId/edit" element={<SongEditPage />} />
                <Route path="/templates" element={<TemplateListPage />} />
                <Route path="/templates/new" element={<TemplateNewPage />} />
                <Route path="/templates/:templateId/edit" element={<TemplateEditPage />} />
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
