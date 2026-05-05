import type { PageResult, PagingQuery } from '../list-query'
import type { PartRequestBody, Project, ProjectContainer, ProjectVariable } from '../models/project'

export abstract class ProjectRepository {
  abstract getProjects(userId: string): Promise<Project[]>
  abstract getProjectsPage(userId: string, query: PagingQuery): Promise<PageResult<Project>>
  abstract getProjectsPartial(userId: string, size: number): Promise<Project[]>
  abstract createProject(requestBody: { templateId: string; userId: string; name: string }): Promise<Project>
  abstract patchProject(
    projectId: string,
    requestBody: { name: string | null; templateId: string | null; parts: PartRequestBody[] | null }
  ): Promise<Project>
  abstract deleteProject(projectId: string): Promise<void>
  abstract getProjectContainers(projectId: string): Promise<ProjectContainer[]>
  abstract createProjectContainer(requestBody: {
    projectId: string
    userId: string
    containerName: string
  }): Promise<ProjectContainer>
  abstract patchProjectContainer(
    projectContainerId: string,
    requestBody: { containerName: string | null; completed: boolean | null; parts: PartRequestBody[] | null }
  ): Promise<ProjectContainer>
  abstract deleteProjectContainer(projectContainerId: string): Promise<void>
  abstract exportPPT(
    projectContainerId: string,
    requestBody: { savePptFilename: string; projectId: string; userId: string }
  ): Promise<{ downloadUrl?: string; path?: string; filename?: string; exportId?: string }>
  abstract getProjectVariables(projectId: string): Promise<ProjectVariable[]>
  abstract getProjectVariable(projectId: string, name: string): Promise<ProjectVariable>
  abstract createProjectVariable(
    projectId: string,
    requestBody: { name: string; value: string }
  ): Promise<ProjectVariable>
  abstract patchProjectVariable(
    projectId: string,
    name: string,
    requestBody: { value?: string | null }
  ): Promise<ProjectVariable>
  abstract deleteProjectVariable(projectId: string, name: string): Promise<void>
}
