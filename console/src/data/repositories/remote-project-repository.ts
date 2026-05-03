import { httpClient } from '@/api/client'
import { buildPagingSearchParams, type PageResult, type PagingQuery } from '@/domain/list-query'
import type { PartRequestBody, Project, ProjectContainer } from '@/domain/models/project'
import type { ProjectRepository } from '@/domain/repositories/project-repository'

import type {
  CreateProjectContainerRequest,
  CreateProjectContainerResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  DeleteProjectContainerResponse,
  DeleteProjectResponse,
  ExportPPTRequest,
  ExportPPTResponse,
  GetProjectContainersResponse,
  GetProjectsPartialResponse,
  GetProjectsResponse,
  PatchProjectContainerRequest,
  PatchProjectContainerResponse,
  PatchProjectRequest,
  PatchProjectResponse,
  ProjectPageResponse,
} from './messages/remote-project-message'
import { toProject, toProjectContainer } from './messages/remote-project-message'

/** `GET /project/{userId}/page?page&size&sort` */
const projectPagePath = (userId: string): string => `/project/${userId}/page`

/** `GET /project/{userId}/partial?size=` */
const projectPartialPath = (userId: string): string => `/project/${userId}/partial`

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
    const { response } = await httpClient.patch<PatchProjectRequest, PatchProjectResponse>(
      `/project/${projectId}`,
      requestBody
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
    const { response } = await httpClient.patch<PatchProjectContainerRequest, PatchProjectContainerResponse>(
      `/project/container/${projectContainerId}`,
      requestBody
    )
    return toProjectContainer(response)
  }

  async deleteProjectContainer(projectContainerId: string): Promise<void> {
    await httpClient.delete<DeleteProjectContainerResponse>(`/project/container/${projectContainerId}`)
  }

  async exportPPT(projectContainerId: string, requestBody: { savePath: string }): Promise<string> {
    const { response } = await httpClient.post<ExportPPTRequest, ExportPPTResponse>(
      `/project/container/${projectContainerId}/export`,
      requestBody
    )
    return response
  }
}
