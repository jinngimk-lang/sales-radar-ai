import { AppError } from '../utils/app-error.js'

export type SalesAgentMessageRole = 'user' | 'assistant'

export interface SalesAgentHistoryMessage {
  role: SalesAgentMessageRole
  content: string
}

export interface SalesAgentRunInput {
  message: string
  leadId?: string
  history?: SalesAgentHistoryMessage[]
  userId?: string
}

export interface SalesAgentAction {
  id: string
  tool: string
  status: 'completed' | 'failed'
  summary: string
  startedAt: string
  completedAt: string
}

export interface SalesAgentRunResult {
  message: string
  actions: SalesAgentAction[]
  leadIds: string[]
  provider: 'openai'
  model: string
  traceId: string
  requiresApproval: boolean
}

export interface OpenAISalesAgentConfig {
  apiKey?: string
  baseUrl: string
  model: string
  reasoningEffort: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
  timeoutMs: number
  maxToolRounds: number
}

export function readOpenAISalesAgentConfig(
  environment: NodeJS.ProcessEnv = process.env,
): OpenAISalesAgentConfig {
  const configuredEffort = environment.OPENAI_REASONING_EFFORT?.trim()
  const reasoningEffort = isReasoningEffort(configuredEffort)
    ? configuredEffort
    : 'medium'

  return {
    apiKey:
      environment.OPENAI_API_KEY?.trim() ||
      (environment.AI_PROVIDER?.trim().toLowerCase() === 'openai'
        ? environment.AI_API_KEY?.trim()
        : undefined),
    baseUrl: normalizeBaseUrl(
      environment.OPENAI_BASE_URL?.trim() ||
        (environment.AI_PROVIDER?.trim().toLowerCase() === 'openai'
          ? environment.AI_BASE_URL?.trim()
          : undefined) ||
        'https://api.openai.com/v1',
    ),
    model:
      environment.OPENAI_MODEL?.trim() ||
      (environment.AI_PROVIDER?.trim().toLowerCase() === 'openai'
        ? environment.AI_MODEL?.trim()
        : undefined) ||
      'gpt-5.6-sol',
    reasoningEffort,
    timeoutMs:
      Number.parseInt(environment.OPENAI_TIMEOUT_MS ?? '', 10) || 120_000,
    maxToolRounds: clampInteger(
      Number.parseInt(environment.OPENAI_MAX_TOOL_ROUNDS ?? '', 10) || 6,
      1,
      10,
    ),
  }
}

interface OpenAIResponseItem {
  type?: string
  name?: string
  call_id?: string
  arguments?: string
  content?: Array<{ type?: string; text?: string }>
  [key: string]: unknown
}

interface OpenAIResponse {
  id?: string
  model?: string
  output?: OpenAIResponseItem[]
  output_text?: string
  error?: { message?: string }
}

export interface OpenAIResponseClient {
  create(input: Record<string, unknown>): Promise<OpenAIResponse>
}

export interface SalesToolExecutor {
  execute(
    tool: string,
    input: Record<string, unknown>,
  ): Promise<unknown>
}

class FetchOpenAIResponseClient implements OpenAIResponseClient {
  constructor(private readonly config: OpenAISalesAgentConfig) {}

  async create(input: Record<string, unknown>): Promise<OpenAIResponse> {
    if (!this.config.apiKey) {
      throw new AppError(
        503,
        'OPENAI_NOT_CONFIGURED',
        'GPT sales agent is not configured. Add OPENAI_API_KEY to the backend environment.',
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)
    try {
      const response = await fetch(`${this.config.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      })
      const body = (await response.json().catch(() => ({}))) as OpenAIResponse
      if (!response.ok) {
        throw new AppError(
          response.status >= 500 ? 502 : response.status,
          'OPENAI_RESPONSES_ERROR',
          body.error?.message || `OpenAI Responses API failed (${response.status})`,
        )
      }
      return body
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(
        502,
        'OPENAI_RESPONSES_UNAVAILABLE',
        error instanceof Error && error.name === 'AbortError'
          ? 'GPT sales agent timed out. Please retry with a narrower objective.'
          : 'GPT sales agent is temporarily unavailable.',
      )
    } finally {
      clearTimeout(timeout)
    }
  }
}

interface ApiEnvelope<T> {
  data: T
  meta?: { total?: number }
}

interface SearchTaskSnapshot {
  id: string
  status: string
  resultCount?: number
  errorMessage?: string | null
}

export class InternalSalesToolExecutor implements SalesToolExecutor {
  constructor(
    private readonly apiBaseUrl = readInternalApiBaseUrl(),
    private readonly pollIntervalMs = 1_000,
    private readonly maxPollAttempts = 120,
  ) {}

  async execute(tool: string, input: Record<string, unknown>): Promise<unknown> {
    switch (tool) {
      case 'discover_leads':
        return this.discoverLeads(input)
      case 'list_sales_candidates':
        return this.listCandidates(input)
      case 'inspect_lead':
        return this.request(`/leads/${requiredString(input.leadId, 'leadId')}`)
      case 'discover_public_contacts':
        return this.request(
          `/leads/${requiredString(input.leadId, 'leadId')}/contacts`,
          { method: 'POST', body: '{}' },
        )
      case 'research_lead':
        return this.request(
          `/leads/${requiredString(input.leadId, 'leadId')}/research`,
          { method: 'POST', body: '{}' },
        )
      case 'generate_outreach':
        return this.request(
          `/leads/${requiredString(input.leadId, 'leadId')}/outreach`,
          {
            method: 'POST',
            body: JSON.stringify({
              contactId: optionalString(input.contactId),
              objective: optionalString(input.objective),
              language: oneOf(input.language, ['auto', 'zh', 'en'], 'auto'),
              tone: oneOf(
                input.tone,
                ['mirror', 'formal', 'concise', 'consultative'],
                'mirror',
              ),
            }),
          },
        )
      default:
        throw new AppError(400, 'UNKNOWN_AGENT_TOOL', `Unsupported sales tool: ${tool}`)
    }
  }

  private async discoverLeads(input: Record<string, unknown>) {
    const keyword = requiredString(input.query, 'query').slice(0, 500)
    const taskEnvelope = await this.request<ApiEnvelope<SearchTaskSnapshot>>(
      '/search-task',
      {
        method: 'POST',
        body: JSON.stringify({
          keyword,
          productContext: compactRecord({
            product: optionalString(input.product),
            industry: optionalString(input.industry),
            region: optionalString(input.region),
            customerType: optionalString(input.customerType),
            businessProblem: optionalString(input.businessProblem),
          }),
        }),
      },
    )
    const task = taskEnvelope.data

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt += 1) {
      const latest = await this.request<ApiEnvelope<SearchTaskSnapshot>>(
        `/search-task/${task.id}`,
      )
      if (latest.data.status === 'COMPLETED') {
        const results = await this.request<ApiEnvelope<unknown[]>>(
          `/search-task/${task.id}/results`,
        )
        return {
          task: latest.data,
          total: results.meta?.total ?? results.data.length,
          leads: results.data.slice(0, 20),
        }
      }
      if (['FAILED', 'CANCELLED'].includes(latest.data.status)) {
        return {
          task: latest.data,
          total: 0,
          leads: [],
          warning: latest.data.errorMessage || 'Search task did not complete.',
        }
      }
      await wait(this.pollIntervalMs)
    }

    return {
      task: { ...task, status: 'RUNNING' },
      total: 0,
      leads: [],
      warning: 'Search continues in the background. Use list_sales_candidates on the next turn.',
    }
  }

  private async listCandidates(input: Record<string, unknown>) {
    const envelope = await this.request<ApiEnvelope<Array<Record<string, unknown>>>>(
      '/assistant/leads',
    )
    const keyword = optionalString(input.keyword)?.toLowerCase()
    const limit = clampInteger(numberValue(input.limit) ?? 12, 1, 30)
    const candidates = keyword
      ? envelope.data.filter((lead) =>
          JSON.stringify(lead).toLowerCase().includes(keyword),
        )
      : envelope.data
    return {
      total: candidates.length,
      leads: candidates.slice(0, limit),
    }
  }

  private async request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Sales-Agent-Internal': '1',
        ...init?.headers,
      },
    })
    const body = (await response.json().catch(() => ({}))) as T & {
      error?: { message?: string }
    }
    if (!response.ok) {
      throw new AppError(
        response.status,
        'SALES_TOOL_FAILED',
        body.error?.message || `Sales tool request failed (${response.status})`,
      )
    }
    return body
  }
}

export class OpenAISalesAgentService {
  private readonly client: OpenAIResponseClient
  private readonly executor: SalesToolExecutor

  constructor(
    private readonly config: OpenAISalesAgentConfig =
      readOpenAISalesAgentConfig(),
    client?: OpenAIResponseClient,
    executor?: SalesToolExecutor,
  ) {
    this.client = client ?? new FetchOpenAIResponseClient(config)
    this.executor = executor ?? new InternalSalesToolExecutor()
  }

  async run(input: SalesAgentRunInput): Promise<SalesAgentRunResult> {
    const message = input.message.trim()
    if (!message) {
      throw new AppError(400, 'VALIDATION_ERROR', 'message is required')
    }
    if (!this.config.apiKey) {
      throw new AppError(
        503,
        'OPENAI_NOT_CONFIGURED',
        'GPT sales agent is not configured. Add OPENAI_API_KEY to the Railway backend environment.',
      )
    }

    const traceId = `tr_${crypto.randomUUID()}`
    const actions: SalesAgentAction[] = []
    const leadIds = new Set<string>()
    const conversation: unknown[] = [
      ...(input.history ?? []).slice(-12).map((item) => ({
        role: item.role,
        content: item.content.slice(0, 8_000),
      })),
      {
        role: 'user',
        content: [
          message.slice(0, 12_000),
          input.leadId ? `\nSelected lead id: ${input.leadId}` : '',
          `\nTrace id: ${traceId}`,
        ].join(''),
      },
    ]

    let model = this.config.model
    for (let round = 0; round <= this.config.maxToolRounds; round += 1) {
      const response = await this.client.create({
        model: this.config.model,
        store: false,
        include: ['reasoning.encrypted_content'],
        reasoning: { effort: this.config.reasoningEffort },
        instructions: SALES_AGENT_INSTRUCTIONS,
        input: conversation,
        tools: SALES_AGENT_TOOLS,
        tool_choice: 'auto',
        max_output_tokens: 4_000,
        text: { verbosity: 'medium' },
      })
      model = response.model || model
      const output = Array.isArray(response.output) ? response.output : []
      const calls = output.filter(
        (item) =>
          item.type === 'function_call' &&
          typeof item.name === 'string' &&
          typeof item.call_id === 'string',
      )

      if (calls.length === 0) {
        return {
          message: extractResponseText(response) || fallbackSummary(actions),
          actions,
          leadIds: [...leadIds],
          provider: 'openai',
          model,
          traceId,
          requiresApproval: actions.some((action) => action.tool === 'generate_outreach'),
        }
      }
      if (round === this.config.maxToolRounds) {
        break
      }

      conversation.push(...output)
      for (const call of calls) {
        const startedAt = new Date().toISOString()
        const actionId = call.call_id as string
        const toolName = call.name as string
        let toolOutput: unknown
        let status: SalesAgentAction['status'] = 'completed'
        try {
          const argumentsValue = parseToolArguments(call.arguments)
          toolOutput = await this.executor.execute(toolName, argumentsValue)
          collectLeadIds(toolOutput, leadIds)
        } catch (error) {
          status = 'failed'
          toolOutput = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }
        }
        const completedAt = new Date().toISOString()
        actions.push({
          id: actionId,
          tool: toolName,
          status,
          summary: summarizeToolResult(toolName, toolOutput, status),
          startedAt,
          completedAt,
        })
        conversation.push({
          type: 'function_call_output',
          call_id: actionId,
          output: JSON.stringify(toolOutput),
        })
      }
    }

    return {
      message: fallbackSummary(actions),
      actions,
      leadIds: [...leadIds],
      provider: 'openai',
      model,
      traceId,
      requiresApproval: actions.some((action) => action.tool === 'generate_outreach'),
    }
  }
}

const SALES_AGENT_INSTRUCTIONS = `You are Sales Radar AI's execution supervisor. Turn the user's sales goal into real tool calls, not generic advice.

Operating policy:
- Work autonomously through discovery, candidate review, public-contact discovery, lead research and personalized outreach preparation.
- Use discover_leads when the user asks to find new customers. Use list_sales_candidates for existing results. Inspect and research the strongest relevant leads, and discover contacts when useful.
- Keep people, companies, suppliers and intermediaries visible as separate audience types. Never discard a real source just because contact fields are missing.
- Never invent a person, company, email, phone, social profile, buying signal, prior relationship, price, case study or completed action. Say Unknown when a field is not observed.
- External messages are drafts until an authenticated sending channel returns an external message id. This runtime does not provide a send tool, so never claim that an email, LinkedIn message, WhatsApp message or call was sent.
- When an outreach draft is prepared, clearly state the next contact action and that the user must confirm/open the channel.
- Prefer a compact Chinese progress/result summary unless the user requests another language. Include lead names, evidence-backed reason, available contact channels and the next best action.
- Stop after the requested outcome is reached or when a required credential/channel is unavailable. Do not repeat failed tools.`

const SALES_AGENT_TOOLS = [
  {
    type: 'function',
    name: 'discover_leads',
    description:
      'Run a real hosted-web sales search and wait for the resulting people, companies, suppliers and intermediaries.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Specific search objective and target market.' },
        product: { type: 'string' },
        industry: { type: 'string' },
        region: { type: 'string' },
        customerType: { type: 'string' },
        businessProblem: { type: 'string' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'list_sales_candidates',
    description: 'List existing real-source sales candidates available to the assistant.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 30 },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'inspect_lead',
    description: 'Read one lead and its full source-backed fields.',
    parameters: {
      type: 'object',
      properties: { leadId: { type: 'string' } },
      required: ['leadId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'discover_public_contacts',
    description:
      'Refresh a lead from permitted public first-party pages and return only observed names, roles, emails, phones and social profiles with evidence.',
    parameters: {
      type: 'object',
      properties: { leadId: { type: 'string' } },
      required: ['leadId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'research_lead',
    description: 'Generate source-grounded company/person research, fit, signals, risks and sales angle.',
    parameters: {
      type: 'object',
      properties: { leadId: { type: 'string' } },
      required: ['leadId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'generate_outreach',
    description:
      'Prepare evidence-grounded email, LinkedIn, WhatsApp and call drafts for a real lead/contact. This tool prepares content; it does not send.',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        contactId: { type: 'string' },
        objective: { type: 'string' },
        language: { type: 'string', enum: ['auto', 'zh', 'en'] },
        tone: { type: 'string', enum: ['mirror', 'formal', 'concise', 'consultative'] },
      },
      required: ['leadId'],
      additionalProperties: false,
    },
  },
] as const

function extractResponseText(response: OpenAIResponse): string {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim()
  }
  return (response.output ?? [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === 'output_text' && typeof content.text === 'string')
    .map((content) => content.text!.trim())
    .filter(Boolean)
    .join('\n')
}

function parseToolArguments(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function collectLeadIds(value: unknown, target: Set<string>): void {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item) => collectLeadIds(item, target))
    return
  }
  const record = value as Record<string, unknown>
  if (
    typeof record.id === 'string' &&
    /^c[a-z0-9]{8,}$/i.test(record.id) &&
    ['sourceUrl', 'postContent', 'displayName', 'customerName'].some(
      (key) => typeof record[key] === 'string',
    )
  ) {
    target.add(record.id)
  }
  for (const [key, item] of Object.entries(record)) {
    if (key === 'leadId' && typeof item === 'string' && /^c[a-z0-9]{8,}$/i.test(item)) {
      target.add(item)
    } else if (key === 'leads' || key === 'data') {
      collectLeadIds(item, target)
    }
  }
}

function summarizeToolResult(
  tool: string,
  value: unknown,
  status: SalesAgentAction['status'],
): string {
  if (status === 'failed') {
    const message = readNestedString(value, 'error')
    return message ? `执行失败：${message}` : '执行失败'
  }
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const total = numberValue(record.total) ?? numberValue(readNested(record, ['meta', 'total']))
  if (tool === 'discover_leads') return `真实来源搜索完成${total === undefined ? '' : `，获得 ${total} 条结果`}`
  if (tool === 'list_sales_candidates') return `已读取${total === undefined ? '' : ` ${total} 个`}可用对象`
  if (tool === 'discover_public_contacts') return `公开联系方式补全完成${total === undefined ? '' : `，返回 ${total} 条联系人`}`
  if (tool === 'research_lead') return '客户与购买信号研究完成'
  if (tool === 'generate_outreach') return '个性化多渠道话术已生成，等待发送确认'
  return '对象详情读取完成'
}

function fallbackSummary(actions: SalesAgentAction[]): string {
  if (actions.length === 0) {
    return '我暂时没有执行到可验证的销售动作。请补充产品、目标客户或地区后重试。'
  }
  return [
    `已完成 ${actions.filter((item) => item.status === 'completed').length} 个销售动作。`,
    ...actions.map((item) => `- ${item.summary}`),
    '如果已生成话术，请在联系人卡片中核对收件人与内容后打开对应渠道。',
  ].join('\n')
}

function readInternalApiBaseUrl(environment: NodeJS.ProcessEnv = process.env) {
  const configured = environment.BACKEND_INTERNAL_API_URL?.trim()
  if (configured) return normalizeBaseUrl(configured)
  return `http://127.0.0.1:${environment.PORT?.trim() || '3001'}/api`
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, 'INVALID_TOOL_ARGUMENT', `${fieldName} is required`)
  }
  return value.trim()
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function compactRecord(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && allowed.includes(value as T)
    ? (value as T)
    : fallback
}

function readNested(value: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = value
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function readNestedString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const nested = (value as Record<string, unknown>)[key]
  return typeof nested === 'string' ? nested : undefined
}

function isReasoningEffort(
  value: string | undefined,
): value is OpenAISalesAgentConfig['reasoningEffort'] {
  return ['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(value ?? '')
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function wait(delayMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs))
}

export const openAISalesAgent = new OpenAISalesAgentService()
