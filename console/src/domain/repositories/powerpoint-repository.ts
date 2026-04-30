import type { Layout, Template, TemplateFile } from '@/domain/models/powerpoint'

export abstract class PowerpointRepository {
  abstract readTemplate(requestBody: {
    file: File
    userId: string
    templateName: string
  }): Promise<{ templateFile: TemplateFile; template: Template }>
  abstract updateTemplate(requestBody: {
    file: File
    userId: string
    templateId: string
  }): Promise<{ templateFile: TemplateFile; template: Template }>
  abstract changeTemplateName(
    templateId: string,
    requestBody: {
      newName: string
    }
  ): Promise<{ templateFile: TemplateFile; template: Template }>
  abstract deleteTemplate(templateId: string): Promise<void>
  abstract listTemplates(userId: string): Promise<{ templateFiles: TemplateFile[]; templates: Template[] }>
  abstract listLayouts(templateId: string): Promise<{ layouts: Layout[] }>
}
