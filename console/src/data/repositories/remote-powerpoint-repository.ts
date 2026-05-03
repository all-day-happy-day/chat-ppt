import { httpClient } from '@/api/client'
import type { Layout } from '@/domain/models/powerpoint'
import type { PowerpointRepository } from '@/domain/repositories/powerpoint-repository'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'

import type {
  ChangeTemplateNameRequest,
  ChangeTemplateNameResponse,
  DeleteTemplateResponse,
  ListLayoutsResponse,
  ListTemplatesResponse,
  ReadTemplateRequest,
  ReadTemplateResponse,
  UpdateTemplateRequest,
  UpdateTemplateResponse,
} from './messages/remote-powerpoint-message'
import { toTemplateResponse } from './messages/remote-powerpoint-message'

export class RemotePowerpointRepository implements PowerpointRepository {
  async readTemplate(requestBody: { file: File; userId: string; templateName: string }): Promise<TemplateResponse> {
    const { response } = await httpClient.post<ReadTemplateRequest, ReadTemplateResponse>(
      `/powerpoint/template/read`,
      requestBody
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
      requestBody
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

  async listLayouts(templateId: string): Promise<{ layouts: Layout[] }> {
    const { response } = await httpClient.get<ListLayoutsResponse>(`/powerpoint/template/layouts/${templateId}`)
    return {
      layouts: response.layouts,
    }
  }
}
