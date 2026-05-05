import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { powerpointUseCase } from '@/di/usecases'
import type { PageResult, PagingQuery } from '@/domain/list-query'
import type { User } from '@/domain/models/user'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'
import { getQueryData } from '@/lib/utils'

import { useGetCurrentUser } from './auth.query'
import { QUERY_KEY } from './key'

function evictDeletedTemplateFromListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  templateId: string,
): void {
  queryClient.setQueriesData<PageResult<TemplateResponse>>(
    { queryKey: ['powerpoint', 'page', userId] },
    (previous: PageResult<TemplateResponse> | undefined): PageResult<TemplateResponse> | undefined => {
      if (previous === undefined) {
        return undefined
      }
      const nextItems: TemplateResponse[] = previous.items.filter(
        (item: TemplateResponse): boolean => item.templateId !== templateId,
      )
      if (nextItems.length === previous.items.length) {
        return previous
      }
      const removed: number = previous.items.length - nextItems.length
      const nextTotalItems: number = Math.max(0, previous.totalItems - removed)
      const nextTotalPages: number = Math.max(1, Math.ceil(nextTotalItems / previous.size))
      return {
        ...previous,
        items: nextItems,
        totalItems: nextTotalItems,
        totalPages: nextTotalPages,
      }
    },
  )

  queryClient.setQueriesData<TemplateResponse[]>(
    { queryKey: QUERY_KEY.POWERPOINT.LIST_ALL(userId) },
    (previous: TemplateResponse[] | undefined): TemplateResponse[] | undefined => {
      if (previous === undefined) {
        return undefined
      }
      const next: TemplateResponse[] = previous.filter(
        (item: TemplateResponse): boolean => item.templateId !== templateId,
      )
      return next.length === previous.length ? previous : next
    },
  )

  queryClient.setQueriesData<TemplateResponse[]>(
    { queryKey: ['powerpoint', 'partial', userId] },
    (previous: TemplateResponse[] | undefined): TemplateResponse[] | undefined => {
      if (previous === undefined) {
        return undefined
      }
      const next: TemplateResponse[] = previous.filter(
        (item: TemplateResponse): boolean => item.templateId !== templateId,
      )
      return next.length === previous.length ? previous : next
    },
  )
}

async function invalidatePowerpointListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: QUERY_KEY.POWERPOINT.LIST_ALL(userId),
      refetchType: 'all',
    }),
    queryClient.invalidateQueries({
      queryKey: ['powerpoint', 'page', userId],
      refetchType: 'all',
    }),
    queryClient.invalidateQueries({
      queryKey: ['powerpoint', 'partial', userId],
      refetchType: 'all',
    }),
  ])
}

export function useReadTemplate() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (requestBody: { file: File; userId: string; templateName: string }) =>
      powerpointUseCase.readTemplate(requestBody),
    onSuccess: async (_, { userId }): Promise<void> => {
      await invalidatePowerpointListQueries(queryClient, userId)
    },
  })

  return mutation
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (requestBody: { file: File; userId: string; templateId: string }) =>
      powerpointUseCase.updateTemplate(requestBody),
    onSuccess: async (_, { userId }): Promise<void> => {
      await invalidatePowerpointListQueries(queryClient, userId)
    },
  })

  return mutation
}

export function useChangeTemplateName() {
  const queryClient = useQueryClient()
  const getCurrentUser = useGetCurrentUser()

  const mutation = useMutation({
    mutationFn: ({ templateId, requestBody }: { templateId: string; requestBody: { newName: string } }) =>
      powerpointUseCase.changeTemplateName(templateId, requestBody),
    onSuccess: async () => {
      const user = getQueryData<User>(getCurrentUser)
      if (user === undefined) {
        return
      }
      await invalidatePowerpointListQueries(queryClient, user.id)
    },
  })

  return mutation
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ templateId }: { templateId: string; userId: string }) =>
      powerpointUseCase.deleteTemplate(templateId),
    onSuccess: async (_void, { userId, templateId }): Promise<void> => {
      evictDeletedTemplateFromListCaches(queryClient, userId, templateId)
      await invalidatePowerpointListQueries(queryClient, userId)
    },
  })

  return mutation
}

export function useListTemplates(userId: string) {
  return useQuery({
    queryKey: QUERY_KEY.POWERPOINT.LIST_ALL(userId),
    queryFn: () => powerpointUseCase.listTemplates(userId),
    enabled: userId !== null && userId !== '',
  })
}

export function useListTemplatesPage(userId: string, query: PagingQuery) {
  return useQuery({
    queryKey: QUERY_KEY.POWERPOINT.PAGE(userId, query.page, query.size, query.sort),
    queryFn: () => powerpointUseCase.listTemplatesPage(userId, query),
    enabled: userId.length > 0,
  })
}

export function useListTemplatesPartial(userId: string, size: number) {
  return useQuery({
    queryKey: QUERY_KEY.POWERPOINT.PARTIAL(userId, size),
    queryFn: () => powerpointUseCase.listTemplatesPartial(userId, size),
    enabled: userId.length > 0 && size > 0,
  })
}

export function useListLayouts(templateId: string, options?: { readonly enabled?: boolean }) {
  const enabled: boolean = options?.enabled ?? true
  return useQuery({
    queryKey: QUERY_KEY.POWERPOINT.LIST_LAYOUTS(templateId),
    queryFn: () => powerpointUseCase.listLayouts(templateId),
    enabled: enabled && templateId.length > 0,
  })
}
