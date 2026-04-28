import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authUseCase } from '@/di/usecases'
import type { Role } from '@/domain/models/user'

import { QUERY_KEY } from './key'

export function useSignIn() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (requestBody: { principal: string; password: string }) => authUseCase.signIn(requestBody),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.AUTH.ME })
    },
  })

  return mutation
}

export function useSignOut() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => authUseCase.signOut(),
    onSuccess: () => {
      queryClient.setQueryData(QUERY_KEY.AUTH.ME, undefined)
    },
  })

  return mutation
}

export function useSignUp() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (requestBody: { email: string; username: string; password: string; role?: Role }) =>
      authUseCase.signUp(requestBody),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.AUTH.ME })
    },
  })

  return mutation
}

export function useVerifyAccessToken() {
  return useQuery({
    queryKey: QUERY_KEY.AUTH.VERIFY,
    retry: false,
    queryFn: async () => {
      try {
        await authUseCase.verify()
        return true
      } catch {
        try {
          await authUseCase.reissue()
          await authUseCase.verify()
          return true
        } catch {
          throw new Error('Failed to verify access token')
        }
      }
    },
  })
}

export function useVerifyPassword() {
  const mutation = useMutation({
    mutationFn: (requestBody: { principal: string; password: string }) => authUseCase.verifyPassword(requestBody),
  })

  return mutation
}

export function useGetCurrentUser() {
  return useQuery({
    queryKey: QUERY_KEY.AUTH.ME,
    queryFn: () => authUseCase.getCurrentUser(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
