import type { PageResult, PagingQuery } from '@/domain/list-query'
import type { Layout } from '@/domain/models/powerpoint'
import type { Size } from '@/domain/valueobjects/powerpoint'

export interface TemplateResponse {
  templateId: string
  userId: string
  name: string
  filename: string
  layoutSize: Size
  createdAt: Date
  updatedAt: Date
}

export abstract class PowerpointRepository {
  abstract readTemplate(requestBody: { file: File; userId: string; templateName: string }): Promise<TemplateResponse>
  abstract updateTemplate(requestBody: { file: File; userId: string; templateId: string }): Promise<TemplateResponse>
  abstract changeTemplateName(
    templateId: string,
    requestBody: {
      newName: string
    }
  ): Promise<TemplateResponse>
  abstract deleteTemplate(templateId: string): Promise<void>
  abstract listTemplates(userId: string): Promise<TemplateResponse[]>
  abstract listTemplatesPage(userId: string, query: PagingQuery): Promise<PageResult<TemplateResponse>>
  abstract listTemplatesPartial(userId: string, size: number): Promise<TemplateResponse[]>
  abstract listLayouts(templateId: string): Promise<{ layouts: Layout[] }>
}
