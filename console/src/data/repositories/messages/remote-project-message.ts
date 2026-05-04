import type { Part, PartRequestBody, Project, ProjectContainer, ProjectVariable } from '@/domain/models/project'

interface BaseProjectResponse {
  id: string
  templateId: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
  parts: Part[]
}

interface BaseProjectContainerResponse {
  id: string
  projectId: string
  containerName: string
  createdAt: string
  updatedAt: string
  completed: boolean
  parts: Part[]
}

export function toProject(response: BaseProjectResponse): Project {
  return {
    id: response.id,
    templateId: response.templateId,
    userId: response.userId,
    name: response.name,
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt),
    parts: response.parts,
  }
}

export function toProjectContainer(response: BaseProjectContainerResponse): ProjectContainer {
  return {
    id: response.id,
    projectId: response.projectId,
    containerName: response.containerName,
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt),
    completed: response.completed,
    parts: response.parts,
  }
}

interface BaseVariableResponse {
  name: string
  value: string
}

export function toProjectVariable(response: BaseVariableResponse): ProjectVariable {
  return {
    name: response.name,
    value: response.value,
  }
}

// GetProjects
export type GetProjectsResponse = BaseProjectResponse[]

// CreateProject
export type CreateProjectRequest = {
  templateId: string
  userId: string
  name: string
}
export type CreateProjectResponse = BaseProjectResponse

// PatchProject
export type PatchProjectRequest = {
  name: string | null
  templateId: string | null
  parts: PartRequestBody[] | null
}
export type PatchProjectResponse = BaseProjectResponse

// DeleteProject
export type DeleteProjectResponse = void

// GetProjectContainers
export type GetProjectContainersResponse = BaseProjectContainerResponse[]

// CreateProjectContainer
export type CreateProjectContainerRequest = {
  projectId: string
  containerName: string
}
export type CreateProjectContainerResponse = BaseProjectContainerResponse

// PatchProjectContainer
export type PatchProjectContainerRequest = {
  containerName: string | null
  completed: boolean | null
  parts: PartRequestBody[] | null
}
export type PatchProjectContainerResponse = BaseProjectContainerResponse

// DeleteProjectContainer
export type DeleteProjectContainerResponse = void

// ExportPPT
export type ExportPPTRequest = {
  savePath: string
}
export type ExportPPTResponse = string

// Project variables (`/project/{project_id}/variables`)
export type GetVariablesResponse = BaseVariableResponse[]
export type CreateVariableRequest = {
  name: string
  value: string
}
export type CreateVariableResponse = BaseVariableResponse
export type GetVariableResponse = BaseVariableResponse
export type PatchVariableRequest = {
  value?: string | null
}
export type PatchVariableResponse = BaseVariableResponse
export type DeleteVariableResponse = void

// Paged list / partial (response keys are camelCase after httpClient snakeToCamel)

export type ProjectPageResponse = {
  items: BaseProjectResponse[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/** `GET /project/{userId}/partial?size=` → `list[GetProjectResponse]` */
export type GetProjectsPartialResponse = BaseProjectResponse[]
