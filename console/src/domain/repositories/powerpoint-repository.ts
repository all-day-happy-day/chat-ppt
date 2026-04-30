import type { Layout } from '@/domain/models/powerpoint'

export interface TemplateResponse {
  templateId: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
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
  abstract listLayouts(templateId: string): Promise<{ layouts: Layout[] }>
}
