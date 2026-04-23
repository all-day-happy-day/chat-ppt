import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { QueryClientProvider, ThemeProvider } from '@/providers'

import { RootLayout } from './layouts/RootLayout/RootLayout'
import { GlobalErrorPage } from './pages/GlobalErrorPage/GlobalErrorPage'
import { NotFoundPage } from './pages/NotFoundPage/NotFoundPage'

export default function App() {
  return (
    <QueryClientProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootLayout />} />
            <Route path="/error" element={<GlobalErrorPage />} />
            <Route path="/notfound" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
