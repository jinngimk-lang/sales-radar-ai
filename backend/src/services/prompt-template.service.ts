import type { AITaskType } from '../providers/ai-platform/ai-task-type.js'
import { prisma } from '../prisma/client.js'

export interface PromptTemplateRecord {
  id: string
  name: string
  taskType: string
  template: string
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface PromptTemplateRepository {
  findLatest(taskType: AITaskType): Promise<PromptTemplateRecord | null>
}

const prismaPromptRepository: PromptTemplateRepository = {
  findLatest: (taskType) =>
    prisma.promptTemplate.findFirst({
      where: { taskType },
      orderBy: { version: 'desc' },
    }),
}

export class PromptTemplateService {
  constructor(
    private readonly repository: PromptTemplateRepository =
      prismaPromptRepository,
  ) {}

  getByTaskType(taskType: AITaskType): Promise<PromptTemplateRecord | null> {
    return this.repository.findLatest(taskType)
  }
}

export const promptTemplates = new PromptTemplateService()
