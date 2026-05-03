import type { PageResult, PagingQuery } from '@/domain/list-query'
import type { ProjectRepository } from '@/domain/repositories/project-repository'

import type { PartRequestBody, Project, ProjectContainer } from '../models/project'

export class ProjectUseCase {
  private readonly projectRepository: ProjectRepository

  constructor(projectRepository: ProjectRepository) {
    this.projectRepository = projectRepository
  }

  async getProjects(userId: string): Promise<Project[]> {
    return this.projectRepository.getProjects(userId)
  }

  async getProjectsPage(userId: string, query: PagingQuery): Promise<PageResult<Project>> {
    return this.projectRepository.getProjectsPage(userId, query)
  }

  async getProjectsPartial(userId: string, size: number): Promise<Project[]> {
    return this.projectRepository.getProjectsPartial(userId, size)
  }

  async createProject(requestBody: { templateId: string; userId: string; name: string }): Promise<Project> {
    return this.projectRepository.createProject(requestBody)
  }

  async patchProject(
    projectId: string,
    requestBody: { name: string | null; templateId: string | null; parts: PartRequestBody[] | null }
  ): Promise<Project> {
    return this.projectRepository.patchProject(projectId, requestBody)
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.projectRepository.deleteProject(projectId)
  }

  async getProjectContainers(projectId: string): Promise<ProjectContainer[]> {
    return this.projectRepository.getProjectContainers(projectId)
  }

  async createProjectContainer(requestBody: {
    projectId: string
    userId: string
    containerName: string
  }): Promise<ProjectContainer> {
    return this.projectRepository.createProjectContainer(requestBody)
  }

  async patchProjectContainer(
    projectContainerId: string,
    requestBody: { containerName: string | null; completed: boolean | null; parts: PartRequestBody[] | null }
  ): Promise<ProjectContainer> {
    return this.projectRepository.patchProjectContainer(projectContainerId, requestBody)
  }

  async deleteProjectContainer(projectContainerId: string): Promise<void> {
    return this.projectRepository.deleteProjectContainer(projectContainerId)
  }

  async exportPPT(projectContainerId: string, requestBody: { savePath: string }): Promise<string> {
    return this.projectRepository.exportPPT(projectContainerId, requestBody)
  }
}
