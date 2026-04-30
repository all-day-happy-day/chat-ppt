import { httpClient } from '@/api/client'
import type { Layout, Template, TemplateFile } from '@/domain/models/powerpoint'
import type { PowerpointRepository } from '@/domain/repositories/powerpoint-repository'

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

export class RemotePowerpointRepository implements PowerpointRepository {
  async readTemplate(requestBody: {
    file: File
    userId: string
    templateName: string
  }): Promise<{ templateFile: TemplateFile; template: Template }> {
    const { response } = await httpClient.post<ReadTemplateRequest, ReadTemplateResponse>(
      `/powerpoint/template/read`,
      requestBody
    )
    return {
      templateFile: response.templateFile,
      template: response.template,
    }
  }

  async updateTemplate(requestBody: {
    file: File
    userId: string
    templateId: string
  }): Promise<{ templateFile: TemplateFile; template: Template }> {
    const { response } = await httpClient.post<UpdateTemplateRequest, UpdateTemplateResponse>(
      `/powerpoint/template/${requestBody.templateId}`,
      requestBody
    )
    return {
      templateFile: response.templateFile,
      template: response.template,
    }
  }

  async changeTemplateName(
    templateId: string,
    requestBody: { newName: string }
  ): Promise<{ templateFile: TemplateFile; template: Template }> {
    const { response } = await httpClient.post<ChangeTemplateNameRequest, ChangeTemplateNameResponse>(
      `/powerpoint/template/name/${templateId}`,
      requestBody
    )
    return {
      templateFile: response.templateFile,
      template: response.template,
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await httpClient.delete<DeleteTemplateResponse>(`/powerpoint/template/${templateId}`)
  }

  async listTemplates(userId: string): Promise<{ templateFiles: TemplateFile[]; templates: Template[] }> {
    const { response } = await httpClient.get<ListTemplatesResponse>(`/powerpoint/template/list/${userId}`)
    return {
      templateFiles: response.templateFiles,
      templates: response.templates,
    }
  }

  async listLayouts(templateId: string): Promise<{ layouts: Layout[] }> {
    const { response } = await httpClient.get<ListLayoutsResponse>(`/powerpoint/template/layouts/${templateId}`)
    return {
      layouts: response.layouts,
    }
  }
}
