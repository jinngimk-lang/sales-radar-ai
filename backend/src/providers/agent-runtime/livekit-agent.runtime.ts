import type { SalesAgentRunResult } from '../../services/openai-sales-agent.service.js'
import { AppError } from '../../utils/app-error.js'
import type { AgentRuntime } from './agent-runtime.interface.js'

export interface LiveKitAgentRuntimeOptions {
  baseUrl: string
  token?: string
  timeoutMs?: number
  fetcher?: typeof fetch
}

export class LiveKitAgentRuntime implements AgentRuntime {
  readonly name = 'livekit' as const
  private readonly baseUrl: string
  private readonly token?: string
  private readonly timeoutMs: number
  private readonly fetcher: typeof fetch

  constructor(options: LiveKitAgentRuntimeOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.token = options.token?.trim() || undefined
    this.timeoutMs = Math.max(1_000, Math.min(120_000, options.timeoutMs ?? 30_000))
    this.fetcher = options.fetcher ?? fetch
  }

  async run(input: Parameters<AgentRuntime['run']>[0]): Promise<SalesAgentRunResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetcher(`${this.baseUrl}/v1/agent/runs`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new AppError(503, 'AGENT_RUNTIME_UNAVAILABLE', 'Sales Agent runtime is temporarily unavailable')
      }
      const payload = await response.json() as unknown
      const root = record(payload)
      const candidate = record(root?.data) ?? root
      const result = parseResult(candidate)
      if (!result) {
        throw new AppError(502, 'AGENT_RUNTIME_INVALID_RESPONSE', 'Sales Agent runtime returned an invalid response')
      }
      return result
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(503, 'AGENT_RUNTIME_UNAVAILABLE', 'Sales Agent runtime is temporarily unavailable')
    } finally {
      clearTimeout(timeout)
    }
  }
}

function parseResult(value: Record<string, unknown> | null): SalesAgentRunResult | null {
  if (!value) return null
  const message = text(value.message)
  const model = text(value.model)
  const traceId = text(value.traceId)
  if (!message || !model || !traceId || !Array.isArray(value.actions) || !Array.isArray(value.leadIds)) return null
  const actions = value.actions.flatMap((item) => {
    const action = record(item)
    const id = text(action?.id)
    const tool = text(action?.tool)
    const summary = text(action?.summary)
    const startedAt = text(action?.startedAt)
    const completedAt = text(action?.completedAt)
    const status = action?.status
    if (!id || !tool || !summary || !startedAt || !completedAt || (status !== 'completed' && status !== 'failed')) return []
    const normalizedStatus: 'completed' | 'failed' = status
    return [{ id, tool, summary, startedAt, completedAt, status: normalizedStatus }]
  })
  if (actions.length !== value.actions.length || !value.leadIds.every((id) => typeof id === 'string')) return null
  return {
    message,
    actions,
    leadIds: value.leadIds as string[],
    provider: 'livekit',
    model,
    traceId,
    requiresApproval: value.requiresApproval !== false,
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
