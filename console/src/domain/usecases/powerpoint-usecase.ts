import type { PowerpointRepository } from '@/domain/repositories/powerpoint-repository'

import type { PageResult, PagingQuery } from '../list-query'
import type { Layout } from '../models/powerpoint'
import type { TemplateResponse } from '../repositories/powerpoint-repository'

export class PowerpointUseCase {
  private readonly powerpointRepository: PowerpointRepository
  constructor(powerpointRepository: PowerpointRepository) {
    this.powerpointRepository = powerpointRepository
  }

  async readTemplate(requestBody: { file: File; userId: string; templateName: string }): Promise<TemplateResponse> {
    return this.powerpointRepository.readTemplate(requestBody)
  }

  async updateTemplate(requestBody: { file: File; userId: string; templateId: string }): Promise<TemplateResponse> {
    return this.powerpointRepository.updateTemplate(requestBody)
  }

  async changeTemplateName(
    templateId: string,
    requestBody: {
      newName: string
    }
  ): Promise<TemplateResponse> {
    return this.powerpointRepository.changeTemplateName(templateId, requestBody)
  }

  async deleteTemplate(templateId: string): Promise<void> {
    return this.powerpointRepository.deleteTemplate(templateId)
  }

  async listTemplates(userId: string): Promise<TemplateResponse[]> {
    return this.powerpointRepository.listTemplates(userId)
  }

  async listTemplatesPage(userId: string, query: PagingQuery): Promise<PageResult<TemplateResponse>> {
    return this.powerpointRepository.listTemplatesPage(userId, query)
  }

  async listTemplatesPartial(userId: string, size: number): Promise<TemplateResponse[]> {
    return this.powerpointRepository.listTemplatesPartial(userId, size)
  }

  async listLayouts(templateId: string): Promise<{ layouts: Layout[] }> {
    return this.powerpointRepository.listLayouts(templateId)
  }
}
