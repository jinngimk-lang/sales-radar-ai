import type { AITaskType } from './ai-task-type.js'

export interface AIGenerateRequest {
  taskType: AITaskType
  prompt: string
  context: Record<string, unknown>
}

export interface AIGenerateResult {
  output: unknown
  provider: string
  model: string
}

export interface AIProvider {
  readonly name: string
  readonly model: string
  generate(request: AIGenerateRequest): Promise<AIGenerateResult>
}

export class AIProviderUnavailableError extends Error {
  constructor(
    public readonly provider: string,
    message = `AI provider ${provider} is unavailable`,
  ) {
    super(message)
    this.name = 'AIProviderUnavailableError'
  }
}
