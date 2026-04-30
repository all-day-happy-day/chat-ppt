import type { PowerpointRepository } from '@/domain/repositories/powerpoint-repository'

import type { Layout, Template, TemplateFile } from '../models/powerpoint'

export class PowerpointUseCase {
  private readonly powerpointRepository: PowerpointRepository
  constructor(powerpointRepository: PowerpointRepository) {
    this.powerpointRepository = powerpointRepository
  }

  async readTemplate(requestBody: {
    file: File
    userId: string
    templateName: string
  }): Promise<{ templateFile: TemplateFile; template: Template }> {
    return this.powerpointRepository.readTemplate(requestBody)
  }

  async updateTemplate(requestBody: {
    file: File
    userId: string
    templateId: string
  }): Promise<{ templateFile: TemplateFile; template: Template }> {
    return this.powerpointRepository.updateTemplate(requestBody)
  }

  async changeTemplateName(
    templateId: string,
    requestBody: {
      newName: string
    }
  ): Promise<{ templateFile: TemplateFile; template: Template }> {
    return this.powerpointRepository.changeTemplateName(templateId, requestBody)
  }

  async deleteTemplate(templateId: string): Promise<void> {
    return this.powerpointRepository.deleteTemplate(templateId)
  }

  async listTemplates(userId: string): Promise<{ templateFiles: TemplateFile[]; templates: Template[] }> {
    return this.powerpointRepository.listTemplates(userId)
  }

  async listLayouts(templateId: string): Promise<{ layouts: Layout[] }> {
    return this.powerpointRepository.listLayouts(templateId)
  }
}
