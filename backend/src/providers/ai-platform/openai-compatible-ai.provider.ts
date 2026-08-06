import {
  AIProviderUnavailableError,
  type AIGenerateRequest,
  type AIGenerateResult,
  type AIProvider,
} from './ai-provider.interface.js'

export interface OpenAICompatibleAIProviderConfig {
  name: string
  apiKey?: string
  model?: string
  baseUrl?: string
  timeoutMs?: number
}

type Fetcher = typeof fetch

export class OpenAICompatibleAIProvider implements AIProvider {
  readonly name: string
  readonly model: string
  private readonly apiKey?: string
  private readonly baseUrl?: string
  private readonly timeoutMs: number

  constructor(
    config: OpenAICompatibleAIProviderConfig,
    private readonly fetcher: Fetcher = fetch,
  ) {
    this.name = config.name.trim().toLowerCase()
    this.apiKey = config.apiKey?.trim() || undefined
    this.model = config.model?.trim() ?? ''
    this.baseUrl = config.baseUrl?.trim() || undefined
    this.timeoutMs = config.timeoutMs ?? 30_000
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
    if (!this.apiKey) {
      throw new AIProviderUnavailableError(
        this.name,
        `${this.name.toUpperCase()} API key is not configured`,
      )
    }
    if (!this.model) {
      throw new AIProviderUnavailableError(
        this.name,
        `${this.name.toUpperCase()} model is not configured`,
      )
    }
    if (!this.baseUrl) {
      throw new AIProviderUnavailableError(
        this.name,
        `${this.name.toUpperCase()} base URL is not configured`,
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    const { fallbackResponse: _fallback, ...safeContext } = request.context
    void _fallback

    try {
      const response = await this.fetcher(this.chatCompletionsUrl(), {
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
                outputRequirement: 'Return one valid JSON object only.',
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
          `${this.name} API request failed with status ${response.status}`,
        )
      }

      const content = this.readContent((await response.json()) as unknown)
      if (!content) {
        throw new AIProviderUnavailableError(
          this.name,
          `${this.name} API response does not contain message content`,
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
        throw new AIProviderUnavailableError(
          this.name,
          `${this.name} API request timed out`,
        )
      }
      throw new AIProviderUnavailableError(
        this.name,
        error instanceof Error
          ? error.message
          : `${this.name} API request failed`,
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  private chatCompletionsUrl(): string {
    const normalized = this.baseUrl!.replace(/\/+$/, '')
    return normalized.endsWith('/chat/completions')
      ? normalized
      : `${normalized}/chat/completions`
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
