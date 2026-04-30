import type { Layout } from '@/domain/models/powerpoint'

export interface ApiTemplateResponse {
  template_id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}
interface BaseTemplateResponse {
  templateId: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
}

export function fromApiResponse(apiTemplateResponse: ApiTemplateResponse): BaseTemplateResponse {
  return {
    templateId: apiTemplateResponse.template_id,
    userId: apiTemplateResponse.user_id,
    name: apiTemplateResponse.name,
    createdAt: apiTemplateResponse.created_at,
    updatedAt: apiTemplateResponse.updated_at,
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
