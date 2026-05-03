import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectUseCase } from '@/di/usecases'
import type { PagingQuery } from '@/domain/list-query'
import type { PartRequestBody } from '@/domain/models/project'

import { QUERY_KEY } from './key'

function invalidateProjectLists(queryClient: ReturnType<typeof useQueryClient>, userId: string): void {
  queryClient.invalidateQueries({ queryKey: ['project', 'page'] })
  queryClient.invalidateQueries({ queryKey: ['project', 'partial'] })
  queryClient.invalidateQueries({ queryKey: QUERY_KEY.PROJECT.GET_ALL(userId) })
}

export function useGetProjects(userId: string) {
  return useQuery({
    queryKey: QUERY_KEY.PROJECT.GET_ALL(userId),
    queryFn: () => projectUseCase.getProjects(userId),
    enabled: !!userId,
  })
}

export function useGetProjectsPage(userId: string, query: PagingQuery) {
  return useQuery({
    queryKey: QUERY_KEY.PROJECT.PAGE(userId, query.page, query.size, query.sort),
    queryFn: () => projectUseCase.getProjectsPage(userId, query),
    enabled: userId.length > 0,
  })
}

export function useGetProjectsPartial(userId: string, size: number) {
  return useQuery({
    queryKey: QUERY_KEY.PROJECT.PARTIAL(userId, size),
    queryFn: () => projectUseCase.getProjectsPartial(userId, size),
    enabled: userId.length > 0 && size > 0,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: { templateId: string; userId: string; name: string }) =>
      projectUseCase.createProject(requestBody),
    onSuccess: (_, { userId }) => {
      invalidateProjectLists(queryClient, userId)
    },
  })
}

export function usePatchProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      requestBody,
    }: {
      projectId: string
      userId: string
      requestBody: { name: string | null; templateId: string | null; parts: PartRequestBody[] | null }
    }) => projectUseCase.patchProject(projectId, requestBody),
    onSuccess: (_, { userId }) => {
      invalidateProjectLists(queryClient, userId)
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId }: { projectId: string; userId: string }) => projectUseCase.deleteProject(projectId),
    onSuccess: (_, { userId }) => {
      invalidateProjectLists(queryClient, userId)
    },
  })
}

export function useGetProjectContainers(projectId: string) {
  return useQuery({
    queryKey: QUERY_KEY.PROJECT.GET_ALL_CONTAINERS(projectId),
    queryFn: () => projectUseCase.getProjectContainers(projectId),
    enabled: !!projectId,
  })
}

export function useCreateProjectContainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: { projectId: string; userId: string; containerName: string }) =>
      projectUseCase.createProjectContainer(requestBody),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.PROJECT.GET_ALL_CONTAINERS(projectId) })
    },
  })
}

export function usePatchProjectContainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectContainerId,
      requestBody,
    }: {
      projectContainerId: string
      requestBody: { containerName: string | null; completed: boolean | null; parts: PartRequestBody[] | null }
    }) => projectUseCase.patchProjectContainer(projectContainerId, requestBody),
    onSuccess: (_, { projectContainerId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.PROJECT.GET_ALL_CONTAINERS(projectContainerId) })
    },
  })
}

export function useDeleteProjectContainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectContainerId: string) => projectUseCase.deleteProjectContainer(projectContainerId),
    onSuccess: (_, projectContainerId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.PROJECT.GET_ALL_CONTAINERS(projectContainerId) })
    },
  })
}

export function useExportPPT() {
  return useMutation({
    mutationFn: ({
      projectContainerId,
      requestBody,
    }: {
      projectContainerId: string
      requestBody: { savePath: string }
    }) => projectUseCase.exportPPT(projectContainerId, requestBody),
  })
}
