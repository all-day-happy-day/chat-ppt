import { httpClient } from '@/api/client'
import type { Layout } from '@/domain/models/powerpoint'
import type { PowerpointRepository } from '@/domain/repositories/powerpoint-repository'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'

import type {
  ApiTemplateResponse,
  ChangeTemplateNameRequest,
  DeleteTemplateResponse,
  ListLayoutsResponse,
  ReadTemplateRequest,
  UpdateTemplateRequest,
} from './messages/remote-powerpoint-message'
import { fromApiResponse } from './messages/remote-powerpoint-message'

export class RemotePowerpointRepository implements PowerpointRepository {
  async readTemplate(requestBody: { file: File; userId: string; templateName: string }): Promise<TemplateResponse> {
    const { response } = await httpClient.post<ReadTemplateRequest, ApiTemplateResponse>(
      `/powerpoint/template/read`,
      requestBody
    )
    return fromApiResponse(response)
  }

  async updateTemplate(requestBody: { file: File; userId: string; templateId: string }): Promise<TemplateResponse> {
    const { response } = await httpClient.post<UpdateTemplateRequest, ApiTemplateResponse>(
      `/powerpoint/template/${requestBody.templateId}`,
      requestBody
    )
    return fromApiResponse(response)
  }

  async changeTemplateName(templateId: string, requestBody: { newName: string }): Promise<TemplateResponse> {
    const { response } = await httpClient.post<ChangeTemplateNameRequest, ApiTemplateResponse>(
      `/powerpoint/template/name/${templateId}`,
      requestBody
    )
    return fromApiResponse(response)
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await httpClient.delete<DeleteTemplateResponse>(`/powerpoint/template/${templateId}`)
  }

  async listTemplates(userId: string): Promise<TemplateResponse[]> {
    const { response } = await httpClient.get<ApiTemplateResponse[]>(`/powerpoint/template/list/${userId}`)
    return response.map((template) => fromApiResponse(template))
  }

  async listLayouts(templateId: string): Promise<{ layouts: Layout[] }> {
    const { response } = await httpClient.get<ListLayoutsResponse>(`/powerpoint/template/layouts/${templateId}`)
    return {
      layouts: response.layouts,
    }
  }
}
