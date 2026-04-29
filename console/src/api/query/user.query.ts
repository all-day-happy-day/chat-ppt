import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { userUseCase } from '@/di/usecases'
import type { Role } from '@/domain/models/user'

import { QUERY_KEY } from './key'

export function useGetUser(id: string) {
  return useQuery({
    queryKey: QUERY_KEY.USER.GET(id),
    queryFn: () => userUseCase.getUser(id),
  })
}

export function useGetUsers() {
  return useQuery({
    queryKey: QUERY_KEY.USER.GETS,
    queryFn: () => userUseCase.getUsers(),
  })
}

export function usePatchUser() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id, requestBody }: { id: string; requestBody: { email?: string; username?: string } }) =>
      userUseCase.patchUser(id, requestBody),
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.AUTH.ME })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.USER.GETS })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.USER.GET(id) })
    },
  })

  return mutation
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (id: string) => userUseCase.deleteUser(id),
    onSuccess: async (_: void, id: string) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.USER.GETS })
      await queryClient.removeQueries({ queryKey: QUERY_KEY.USER.GET(id) })
    },
  })

  return mutation
}

export function usePatchUserRole() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id, requestBody }: { id: string; requestBody: { role: Role } }) =>
      userUseCase.patchUserRole(id, requestBody),
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.AUTH.ME })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.USER.GETS })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.USER.GET(id) })
    },
  })

  return mutation
}
