import { httpClient } from '@/api/client'
import { buildPagingSearchParams, type PageResult, type PagingQuery } from '@/domain/list-query'
import type { Layout } from '@/domain/models/powerpoint'
import type { PowerpointRepository, TemplateResponse } from '@/domain/repositories/powerpoint-repository'

import type {
  ChangeTemplateNameRequest,
  ChangeTemplateNameResponse,
  DeleteTemplateResponse,
  LayoutWire,
  ListLayoutsResponse,
  ListTemplatesResponse,
  ReadTemplateResponse,
  TemplatePageResponse,
  UpdateTemplateRequest,
  UpdateTemplateResponse,
} from './messages/remote-powerpoint-message'
import { toTemplateResponse } from './messages/remote-powerpoint-message'

/** `GET /powerpoint/template/list/page/{user_id}` */
const templateListPagePath = (userId: string): string => `/powerpoint/template/list/page/${userId}`

/** `GET /powerpoint/template/partial/{user_id}?size=` */
const templatePartialPath = (userId: string): string => `/powerpoint/template/partial/${userId}`

export class RemotePowerpointRepository implements PowerpointRepository {
  async readTemplate(requestBody: { file: File; userId: string; templateName: string }): Promise<TemplateResponse> {
    const formData: FormData = new FormData()
    formData.append('file', requestBody.file)
    formData.append('user_id', requestBody.userId)
    formData.append('template_name', requestBody.templateName)

    const { response } = await httpClient.post<FormData, ReadTemplateResponse>(
      `/powerpoint/template/read`,
      formData
    )
    return toTemplateResponse(response)
  }

  async updateTemplate(requestBody: { file: File; userId: string; templateId: string }): Promise<TemplateResponse> {
    const { response } = await httpClient.post<UpdateTemplateRequest, UpdateTemplateResponse>(
      `/powerpoint/template/${requestBody.templateId}`,
      requestBody
    )
    return toTemplateResponse(response)
  }

  async changeTemplateName(templateId: string, requestBody: { newName: string }): Promise<TemplateResponse> {
    const { response } = await httpClient.patch<ChangeTemplateNameRequest, ChangeTemplateNameResponse>(
      `/powerpoint/template/name/${templateId}`,
      { new_name: requestBody.newName }
    )
    return toTemplateResponse(response)
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await httpClient.delete<DeleteTemplateResponse>(`/powerpoint/template/${templateId}`)
  }

  async listTemplates(userId: string): Promise<TemplateResponse[]> {
    const { response } = await httpClient.get<ListTemplatesResponse>(`/powerpoint/template/list/${userId}`)
    return response.map((template) => toTemplateResponse(template))
  }

  async listTemplatesPage(userId: string, query: PagingQuery): Promise<PageResult<TemplateResponse>> {
    const { response } = await httpClient.get<TemplatePageResponse>(
      templateListPagePath(userId),
      undefined,
      buildPagingSearchParams(query)
    )
    return {
      items: response.items.map((row) => toTemplateResponse(row)),
      page: response.page,
      size: response.size,
      totalItems: response.totalItems,
      totalPages: response.totalPages,
    }
  }

  async listTemplatesPartial(userId: string, size: number): Promise<TemplateResponse[]> {
    const params: URLSearchParams = new URLSearchParams()
    params.set('size', String(size))
    const { response } = await httpClient.get<ListTemplatesResponse>(templatePartialPath(userId), undefined, params)
    return response.map((row) => toTemplateResponse(row))
  }

  async listLayouts(templateId: string): Promise<{ layouts: Layout[] }> {
    const { response } = await httpClient.get<ListLayoutsResponse>(`/powerpoint/template/layouts/${templateId}`)
    return {
      layouts: response.map((row: LayoutWire): Layout => ({
        id: row.id,
        templateId,
        name: row.name,
        shapes: row.shapes,
        backgroundColor: row.backgroundColor,
        slideSize: row.slideSize,
      })),
    }
  }
}
