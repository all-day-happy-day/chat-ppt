import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { QueryClientProvider, ThemeProvider } from '@/providers'

import { GlobalErrorPage } from './layouts/misc/GlobalErrorPage/GlobalErrorPage'
import { RootLayout } from './layouts/RootLayout/RootLayout'

function App() {
  return (
    <QueryClientProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootLayout />} />
            <Route path="/error" element={<GlobalErrorPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
