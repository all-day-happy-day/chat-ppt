import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { QueryClientProvider, ThemeProvider } from '@/providers'

import { RootLayout } from './layouts/root-layout/RootLayout'
import { GlobalErrorPage } from './pages/global-error-page/GlobalErrorPage'
import { NotFoundPage } from './pages/not-found-page/NotFoundPage'

export default function App() {
  return (
    <QueryClientProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route path="/error" element={<GlobalErrorPage />} />
              <Route path="/notfound" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
