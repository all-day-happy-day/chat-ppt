import type { Layout, Template, TemplateFile } from '@/domain/models/powerpoint'

interface BaseTemplateResponse {
  templateFile: TemplateFile
  template: Template
}

// ReadTemplates
export type ReadTemplateRequest = {
  file: File
  userId: string
  templateName: string
}
export type ReadTemplateResponse = BaseTemplateResponse

// UpdateTemplates
export type UpdateTemplateRequest = {
  file: File
  userId: string
  templateId: string
}
export type UpdateTemplateResponse = BaseTemplateResponse

// ChangeTemplateName
export type ChangeTemplateNameRequest = {
  newName: string
}
export type ChangeTemplateNameResponse = BaseTemplateResponse

// DeleteTemplate
export type DeleteTemplateResponse = void

// ListTemplates
export type ListTemplatesResponse = {
  templateFiles: TemplateFile[]
  templates: Template[]
}

// ListLayouts
export type ListLayoutsResponse = { layouts: Layout[] }
