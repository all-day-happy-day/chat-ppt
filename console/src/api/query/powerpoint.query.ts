import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { powerpointUseCase } from '@/di/usecases'

import { QUERY_KEY } from './key'

export function useReadTemplate() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (requestBody: { file: File; userId: string; templateName: string }) =>
      powerpointUseCase.readTemplate(requestBody),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.POWERPOINT.LIST_ALL })
    },
  })

  return mutation
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (requestBody: { file: File; userId: string; templateId: string }) =>
      powerpointUseCase.updateTemplate(requestBody),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.POWERPOINT.LIST_ALL })
    },
  })

  return mutation
}

export function useChangeTemplateName() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ templateId, requestBody }: { templateId: string; requestBody: { newName: string } }) =>
      powerpointUseCase.changeTemplateName(templateId, requestBody),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.POWERPOINT.LIST_ALL })
    },
  })

  return mutation
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (templateId: string) => powerpointUseCase.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.POWERPOINT.LIST_ALL })
    },
  })

  return mutation
}

export function useListTemplates(userId: string) {
  return useQuery({
    queryKey: QUERY_KEY.POWERPOINT.LIST_ALL,
    queryFn: () => powerpointUseCase.listTemplates(userId),
  })
}

export function useListLayouts(templateId: string) {
  return useQuery({
    queryKey: QUERY_KEY.POWERPOINT.LIST_LAYOUTS(templateId),
    queryFn: () => powerpointUseCase.listLayouts(templateId),
  })
}
