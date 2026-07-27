import {
  AIProviderUnavailableError,
  type AIGenerateRequest,
  type AIGenerateResult,
  type AIProvider,
} from './ai-provider.interface.js'

export interface QwenAIProviderConfig {
  apiKey?: string
  model?: string
  baseUrl?: string
  timeoutMs?: number
}

type Fetcher = typeof fetch

export class QwenAIProvider implements AIProvider {
  readonly name = 'qwen'
  readonly model: string
  private readonly apiKey?: string
  private readonly baseUrl?: string
  private readonly timeoutMs: number

  constructor(
    config: QwenAIProviderConfig,
    private readonly fetcher: Fetcher = fetch,
  ) {
    this.apiKey = config.apiKey
    this.model = config.model ?? ''
    this.baseUrl = config.baseUrl
    this.timeoutMs = config.timeoutMs ?? 15_000
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
    if (!this.apiKey) {
      throw new AIProviderUnavailableError('qwen', 'AI_API_KEY is not configured')
    }
    if (!this.model) {
      throw new AIProviderUnavailableError('qwen', 'AI_MODEL is not configured')
    }
    if (!this.baseUrl) {
      throw new AIProviderUnavailableError('qwen', 'AI_BASE_URL is not configured')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    const { fallbackResponse: _fallback, ...safeContext } = request.context
    void _fallback

    try {
      const response = await this.fetcher(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: request.prompt },
            {
              role: 'user',
              content: JSON.stringify({
                taskType: request.taskType,
                context: safeContext,
              }),
            },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new AIProviderUnavailableError(
          this.name,
          `Qwen API request failed with status ${response.status}`,
        )
      }

      const payload = (await response.json()) as unknown
      const content = this.readContent(payload)
      if (!content) {
        throw new AIProviderUnavailableError(
          this.name,
          'Qwen API response does not contain message content',
        )
      }

      return {
        output: content,
        provider: this.name,
        model: this.model,
      }
    } catch (error) {
      if (error instanceof AIProviderUnavailableError) throw error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIProviderUnavailableError(this.name, 'Qwen API request timed out')
      }
      throw new AIProviderUnavailableError(
        this.name,
        error instanceof Error ? error.message : 'Qwen API request failed',
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  private readContent(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null
    const choices = (payload as { choices?: unknown }).choices
    if (!Array.isArray(choices) || choices.length === 0) return null
    const first = choices[0]
    if (!first || typeof first !== 'object') return null
    const message = (first as { message?: unknown }).message
    if (!message || typeof message !== 'object') return null
    const content = (message as { content?: unknown }).content
    return typeof content === 'string' && content.trim()
      ? content.trim()
      : null
  }
}
