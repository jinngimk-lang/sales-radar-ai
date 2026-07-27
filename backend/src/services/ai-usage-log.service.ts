import type { AITaskType } from '../providers/ai-platform/ai-task-type.js'
import { prisma } from '../prisma/client.js'

export interface AIUsageEntry {
  taskType: AITaskType
  provider: string
  model: string
  success: boolean
  latencyMs: number
}

export interface AIUsageLogRepository {
  create(entry: AIUsageEntry): Promise<unknown>
}

const prismaAIUsageRepository: AIUsageLogRepository = {
  create: (entry) => prisma.aIUsageLog.create({ data: entry }),
}

export class AIUsageLogService {
  constructor(
    private readonly repository: AIUsageLogRepository =
      prismaAIUsageRepository,
  ) {}

  async record(entry: AIUsageEntry): Promise<void> {
    await this.repository.create({
      ...entry,
      latencyMs: Math.max(0, Math.round(entry.latencyMs)),
    })
  }

  async safeRecord(entry: AIUsageEntry): Promise<void> {
    try {
      await this.record(entry)
    } catch {
      // Usage telemetry must never break the business fallback path.
    }
  }
}

export const aiUsageLogs = new AIUsageLogService()
