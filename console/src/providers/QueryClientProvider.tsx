import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from '@tanstack/react-query'

import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnReconnect: 'always',
    },
  },
})

export function QueryClientProvider({ children }: { children: ReactNode }) {
  return <TanstackQueryClientProvider client={queryClient}>{children}</TanstackQueryClientProvider>
}
