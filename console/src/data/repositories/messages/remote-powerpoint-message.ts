import type { Layout } from '@/domain/models/powerpoint'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'

export interface BaseTemplateResponse {
  templateId: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
}

export function toTemplateResponse(response: BaseTemplateResponse): TemplateResponse {
  return {
    templateId: response.templateId,
    userId: response.userId,
    name: response.name,
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt),
  }
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
export type ListTemplatesResponse = BaseTemplateResponse[]

// ListLayouts
export type ListLayoutsResponse = { layouts: Layout[] }
