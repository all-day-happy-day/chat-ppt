import { useQuery } from '@tanstack/react-query'

import { authUseCase } from '@/di/usecases'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authUseCase.getCurrentUser(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
