import { httpClient } from '@/api/client'
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
  GetProjectsResponse,
  PatchProjectContainerRequest,
  PatchProjectContainerResponse,
  PatchProjectRequest,
  PatchProjectResponse,
} from './messages/remote-project-message'
import { toProject, toProjectContainer } from './messages/remote-project-message'

export class RemoteProjectRepository implements ProjectRepository {
  async getProjects(userId: string): Promise<Project[]> {
    const { response } = await httpClient.get<GetProjectsResponse>(`/project/${userId}`)
    return response.map((project) => toProject(project))
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
