import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type LocalSlideLike,
  workspaceHasIncompletePartsForPptExport,
} from '@/App/authenticated/project-view/build-project-parts-patch-payload'
import { projectUseCase } from '@/di/usecases'
import type { PagingQuery } from '@/domain/list-query'
import type { Part, PartRequestBody } from '@/domain/models/project'

import { QUERY_KEY } from './key'

/** Thrown by `useExportPPT` when `workspace` is passed and Bible/Lyrics slides are incomplete. */
export class WorkspaceExportIncompleteError extends Error {
  override readonly name: string = 'WorkspaceExportIncompleteError'

  constructor() {
    super('WORKSPACE_EXPORT_INCOMPLETE')
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

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
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.PROJECT.GET_ALL_CONTAINERS(updated.projectId) })
    },
  })
}

export function useDeleteProjectContainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectContainerId: string) => projectUseCase.deleteProjectContainer(projectContainerId),
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: ['project', 'get', 'all', 'containers'] })
    },
  })
}

export function useExportPPT() {
  return useMutation({
    mutationFn: async ({
      projectContainerId,
      requestBody,
      workspace,
    }: {
      projectContainerId: string
      requestBody: { savePath: string }
      /** When set, the mutation rejects if any slide fails Bible/Lyrics export readiness. */
      workspace?: {
        readonly slides: readonly LocalSlideLike[]
        readonly partsById: Readonly<Record<string, Part>>
        /** Part ids with Bible editor validation/probe errors (incomplete export). */
        readonly bibleUiBlockedPartIds?: ReadonlySet<string> | undefined
      }
    }): Promise<string> => {
      if (
        workspace !== undefined &&
        workspaceHasIncompletePartsForPptExport(
          workspace.slides,
          workspace.partsById,
          workspace.bibleUiBlockedPartIds
        )
      ) {
        throw new WorkspaceExportIncompleteError()
      }
      return projectUseCase.exportPPT(projectContainerId, requestBody)
    },
  })
}
