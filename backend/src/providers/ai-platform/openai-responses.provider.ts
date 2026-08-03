import type {
  AIGenerateRequest,
  AIGenerateResult,
  AIProvider,
} from './ai-provider.interface.js'
import { AIProviderUnavailableError } from './ai-provider.interface.js'

export interface OpenAIResponsesProviderConfig {
  apiKey?: string
  model?: string
  baseUrl?: string
  timeoutMs?: number
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
}

interface OpenAIResponseBody {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{ type?: string; text?: string }>
  }>
  error?: { message?: string }
}

/**
 * GPT provider for existing product-understanding, research and outreach tasks.
 * Agentic tool execution lives in OpenAISalesAgentService; this adapter keeps
 * the pre-existing AIProvider contract working through the Responses API.
 */
export class OpenAIResponsesProvider implements AIProvider {
  readonly name = 'openai'
  readonly model: string
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly reasoningEffort: NonNullable<
    OpenAIResponsesProviderConfig['reasoningEffort']
  >

  constructor(private readonly config: OpenAIResponsesProviderConfig = {}) {
    this.model = config.model?.trim() || 'gpt-5.6-sol'
    this.baseUrl = (config.baseUrl?.trim() || 'https://api.openai.com/v1').replace(
      /\/+$/,
      '',
    )
    this.timeoutMs = config.timeoutMs ?? 120_000
    this.reasoningEffort = config.reasoningEffort ?? 'medium'
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
    const apiKey = this.config.apiKey?.trim()
    if (!apiKey) {
      throw new AIProviderUnavailableError(
        this.name,
        'OPENAI_API_KEY is required for the OpenAI provider',
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await fetch(`${this.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          store: false,
          reasoning: { effort: this.reasoningEffort },
          instructions: [
            request.prompt,
            'Use only the supplied context. Never invent missing facts.',
            'Return exactly one valid JSON object and no markdown fences.',
          ].join('\n'),
          input: JSON.stringify({
            taskType: request.taskType,
            context: request.context,
          }),
          max_output_tokens: 4_000,
          text: { verbosity: 'medium' },
        }),
        signal: controller.signal,
      })
      const body = (await response.json().catch(() => ({}))) as OpenAIResponseBody
      if (!response.ok) {
        throw new AIProviderUnavailableError(
          this.name,
          body.error?.message || `OpenAI Responses API failed (${response.status})`,
        )
      }
      const output = readOutputText(body)
      if (!output) {
        throw new AIProviderUnavailableError(
          this.name,
          'OpenAI Responses API returned no text output',
        )
      }
      return { output, provider: this.name, model: this.model }
    } catch (error) {
      if (error instanceof AIProviderUnavailableError) throw error
      throw new AIProviderUnavailableError(
        this.name,
        error instanceof Error && error.name === 'AbortError'
          ? 'OpenAI Responses API timed out'
          : 'OpenAI Responses API is unavailable',
      )
    } finally {
      clearTimeout(timeout)
    }
  }
}

function readOutputText(body: OpenAIResponseBody): string {
  if (typeof body.output_text === 'string' && body.output_text.trim()) {
    return body.output_text.trim()
  }
  return (body.output ?? [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? [])
    .filter(
      (item) => item.type === 'output_text' && typeof item.text === 'string',
    )
    .map((item) => item.text!.trim())
    .filter(Boolean)
    .join('\n')
}
