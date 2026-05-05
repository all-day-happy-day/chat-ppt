import { httpClient } from '@/api/client'
import { buildPagingSearchParams, type PageResult, type PagingQuery } from '@/domain/list-query'
import type { PartRequestBody, Project, ProjectContainer, ProjectVariable } from '@/domain/models/project'
import type { ProjectRepository } from '@/domain/repositories/project-repository'

import type {
  CreateProjectContainerRequest,
  CreateProjectContainerResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  CreateVariableRequest,
  CreateVariableResponse,
  DeleteProjectContainerResponse,
  DeleteProjectResponse,
  DeleteVariableResponse,
  ExportPPTRequest,
  ExportPPTResponse,
  GetProjectContainersResponse,
  GetProjectsPartialResponse,
  GetProjectsResponse,
  GetVariableResponse,
  GetVariablesResponse,
  PatchProjectContainerRequest,
  PatchProjectContainerResponse,
  PatchProjectRequest,
  PatchProjectResponse,
  PatchVariableRequest,
  PatchVariableResponse,
  ProjectPageResponse,
} from './messages/remote-project-message'
import { toProject, toProjectContainer, toProjectVariable } from './messages/remote-project-message'

/** `GET /project/{userId}/page?page&size&sort` */
const projectPagePath = (userId: string): string => `/project/${userId}/page`

/** `GET /project/{userId}/partial?size=` */
const projectPartialPath = (userId: string): string => `/project/${userId}/partial`

/** `GET|POST /project/{projectId}/variables` — per-segment encoding for variable `name`. */
const projectVariablesBasePath = (projectId: string): string => `/project/${projectId}/variables`

const projectVariablePath = (projectId: string, variableName: string): string =>
  `${projectVariablesBasePath(projectId)}/${encodeURIComponent(variableName)}`

function normalizeOptionalShapeId(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined || !Number.isInteger(raw) || raw <= 0) {
    return null
  }
  return raw
}

function sanitizePartRequestBody(part: PartRequestBody): PartRequestBody {
  switch (part.type) {
    case 'LYRICS':
      return {
        id: part.id,
        order: part.order,
        type: 'LYRICS',
        lyricsLayoutId: part.lyricsLayoutId ?? null,
        titleLayoutId: part.titleLayoutId ?? null,
        contents: {
          type: 'LYRICS',
          contents: part.contents.contents ?? [],
          lyricsPlaceholderShapeId:
            Number.isInteger(part.contents.lyricsPlaceholderShapeId) && part.contents.lyricsPlaceholderShapeId > 0
              ? part.contents.lyricsPlaceholderShapeId
              : 0,
          titlePlaceholderShapeId: normalizeOptionalShapeId(part.contents.titlePlaceholderShapeId),
          includeTitleForFirstCard: part.contents.includeTitleForFirstCard,
        },
      }
    case 'BIBLE':
      return {
        id: part.id,
        order: part.order,
        type: 'BIBLE',
        phraseLayoutId: part.phraseLayoutId ?? null,
        titleLayoutId: part.titleLayoutId ?? null,
        contents: {
          type: 'BIBLE',
          contents: part.contents.contents ?? [],
          phrasePlaceholderId:
            Number.isInteger(part.contents.phrasePlaceholderId) && part.contents.phrasePlaceholderId > 0
              ? part.contents.phrasePlaceholderId
              : 0,
          phraseRangePlaceholderId:
            part.contents.phraseRangePlaceholderId !== undefined &&
            Number.isInteger(part.contents.phraseRangePlaceholderId) &&
            part.contents.phraseRangePlaceholderId > 0
              ? part.contents.phraseRangePlaceholderId
              : null,
          titlePlaceholderValues: part.contents.titlePlaceholderValues ?? {},
        },
      }
    case 'VALUE':
      return {
        id: part.id,
        order: part.order,
        type: 'VALUE',
        layoutId: part.layoutId ?? null,
        contents: {
          type: 'VALUE',
          contents: part.contents.contents ?? [],
        },
      }
    case 'PLAIN':
      return {
        id: part.id,
        order: part.order,
        type: 'PLAIN',
        layoutId: part.layoutId ?? null,
        contents: { type: 'PLAIN' },
      }
  }
}

function sanitizeParts(parts: PartRequestBody[] | null): PartRequestBody[] | null {
  if (parts === null) {
    return null
  }
  return parts.map((part: PartRequestBody): PartRequestBody => sanitizePartRequestBody(part))
}

export class RemoteProjectRepository implements ProjectRepository {
  async getProjects(userId: string): Promise<Project[]> {
    const { response } = await httpClient.get<GetProjectsResponse>(`/project/${userId}`)
    return response.map((project) => toProject(project))
  }

  async getProjectsPage(userId: string, query: PagingQuery): Promise<PageResult<Project>> {
    const { response } = await httpClient.get<ProjectPageResponse>(
      projectPagePath(userId),
      undefined,
      buildPagingSearchParams(query)
    )
    return {
      items: response.items.map((row) => toProject(row)),
      page: response.page,
      size: response.size,
      totalItems: response.totalItems,
      totalPages: response.totalPages,
    }
  }

  async getProjectsPartial(userId: string, size: number): Promise<Project[]> {
    const params: URLSearchParams = new URLSearchParams()
    params.set('size', String(size))
    const { response } = await httpClient.get<GetProjectsPartialResponse>(
      projectPartialPath(userId),
      undefined,
      params
    )
    return response.map((row) => toProject(row))
  }

  async createProject(requestBody: { templateId: string; userId: string; name: string }): Promise<Project> {
    const { response } = await httpClient.post<CreateProjectRequest, CreateProjectResponse>(`/project`, requestBody)
    return toProject(response)
  }

  async patchProject(
    projectId: string,
    requestBody: { name: string | null; templateId: string | null; parts: PartRequestBody[] | null }
  ): Promise<Project> {
    const payload: PatchProjectRequest = {
      ...requestBody,
      parts: sanitizeParts(requestBody.parts),
    }
    const { response } = await httpClient.patch<PatchProjectRequest, PatchProjectResponse>(
      `/project/${projectId}`,
      payload
    )
    return toProject(response)
  }

  async deleteProject(projectId: string): Promise<void> {
    await httpClient.delete<DeleteProjectResponse>(`/project/${projectId}`)
  }

  async getProjectContainers(projectId: string): Promise<ProjectContainer[]> {
    const { response } = await httpClient.get<GetProjectContainersResponse>(`/project/container/${projectId}`)
    return response.map((projectContainer) => toProjectContainer(projectContainer))
  }

  async createProjectContainer(requestBody: {
    projectId: string
    userId: string
    containerName: string
  }): Promise<ProjectContainer> {
    const { response } = await httpClient.post<CreateProjectContainerRequest, CreateProjectContainerResponse>(
      `/project/container`,
      requestBody
    )
    return toProjectContainer(response)
  }

  async patchProjectContainer(
    projectContainerId: string,
    requestBody: { containerName: string | null; completed: boolean | null; parts: PartRequestBody[] | null }
  ): Promise<ProjectContainer> {
    const payload: PatchProjectContainerRequest = {
      ...requestBody,
      parts: sanitizeParts(requestBody.parts),
    }
    const { response } = await httpClient.patch<PatchProjectContainerRequest, PatchProjectContainerResponse>(
      `/project/container/${projectContainerId}`,
      payload
    )
    return toProjectContainer(response)
  }

  async deleteProjectContainer(projectContainerId: string): Promise<void> {
    await httpClient.delete<DeleteProjectContainerResponse>(`/project/container/${projectContainerId}`)
  }

  async exportPPT(
    projectContainerId: string,
    requestBody: { savePptFilename: string; projectId: string; userId: string }
  ): Promise<{ downloadUrl?: string; path?: string; filename?: string; exportId?: string }> {
    const { response } = await httpClient.post<ExportPPTRequest, ExportPPTResponse>(
      `/project/container/${projectContainerId}/export`,
      requestBody
    )
    return response
  }

  async getProjectVariables(projectId: string): Promise<ProjectVariable[]> {
    const { response } = await httpClient.get<GetVariablesResponse>(projectVariablesBasePath(projectId))
    return response.map((row) => toProjectVariable(row))
  }

  async getProjectVariable(projectId: string, name: string): Promise<ProjectVariable> {
    const { response } = await httpClient.get<GetVariableResponse>(projectVariablePath(projectId, name))
    return toProjectVariable(response)
  }

  async createProjectVariable(
    projectId: string,
    requestBody: { name: string; value: string }
  ): Promise<ProjectVariable> {
    const { response } = await httpClient.post<CreateVariableRequest, CreateVariableResponse>(
      projectVariablesBasePath(projectId),
      requestBody
    )
    return toProjectVariable(response)
  }

  async patchProjectVariable(
    projectId: string,
    name: string,
    requestBody: { value?: string | null }
  ): Promise<ProjectVariable> {
    const { response } = await httpClient.patch<PatchVariableRequest, PatchVariableResponse>(
      projectVariablePath(projectId, name),
      requestBody
    )
    return toProjectVariable(response)
  }

  async deleteProjectVariable(projectId: string, name: string): Promise<void> {
    await httpClient.delete<DeleteVariableResponse>(projectVariablePath(projectId, name))
  }
}
