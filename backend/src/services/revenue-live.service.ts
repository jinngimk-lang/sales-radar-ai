import { getRevenueLiveConfig } from '../config/revenue-live.config.js'
import {
  BrowserbaseAgentProvider,
  type BrowserbaseLiveView,
  type BrowserbaseRun,
  type BrowserbaseRunMessages,
} from '../providers/browserbase-agent.provider.js'
import {
  revenueLivePersistence,
  type CreateRevenueLiveEventInput,
  type RevenueLiveEventRecord,
  type RevenueLiveOpportunity,
  type RevenueLiveRunRecord,
  type RevenueLiveRunStatus,
  type UpdateRevenueLiveRunInput,
} from './revenue-live-persistence.service.js'
import {
  buildRevenueResearchTask,
  sanitizeProviderText,
  validateRevenueResearchUrl,
} from './revenue-live-domain.service.js'
import { AppError } from '../utils/app-error.js'

interface RevenueLiveProvider {
  createRun(task: string): Promise<BrowserbaseRun>
  retrieveRun(runId: string): Promise<BrowserbaseRun>
  listMessages(runId: string, since?: string | null): Promise<BrowserbaseRunMessages>
  getLiveView(sessionId: string): Promise<BrowserbaseLiveView>
  releaseSession(sessionId: string): Promise<void>
}

interface RevenueLivePersistencePort {
  getOpportunityForLiveRun(
    userId: string,
    opportunityId?: string | null,
  ): Promise<RevenueLiveOpportunity | null>
  getActiveRun(userId: string): Promise<RevenueLiveRunRecord | null>
  createRun(input: {
    userId: string
    opportunityId: string
    providerRunId: string
    status: RevenueLiveRunStatus
    taskSummary: string
    targetUrl: string
  }): Promise<RevenueLiveRunRecord>
  updateRun(
    userId: string,
    id: string,
    patch: UpdateRevenueLiveRunInput,
  ): Promise<RevenueLiveRunRecord>
  addEvents(
    userId: string,
    runId: string,
    events: CreateRevenueLiveEventInput[],
  ): Promise<void>
  getRunEvents(userId: string, runId: string): Promise<RevenueLiveEventRecord[]>
}

export interface RevenueLiveServiceOptions {
  provider: RevenueLiveProvider | null
  persistence: RevenueLivePersistencePort
  configured: boolean
  loopEnabled: boolean
}

export class RevenueLiveService {
  private readonly provider: RevenueLiveProvider | null
  private readonly persistence: RevenueLivePersistencePort
  private readonly configured: boolean
  private readonly loopEnabled: boolean

  constructor(options: RevenueLiveServiceOptions) {
    this.provider = options.provider
    this.persistence = options.persistence
    this.configured = options.configured
    this.loopEnabled = options.loopEnabled
  }

  async getStatus(userId: string) {
    if (!this.configured || !this.provider) return this.emptyStatus()

    const stored = await this.persistence.getActiveRun(userId)
    if (!stored) return this.emptyStatus()

    let run = stored
    let liveView: BrowserbaseLiveView | null = null

    if (isActiveStatus(run.status)) {
      try {
        const providerRun = await this.provider.retrieveRun(run.providerRunId)
        const messages = await this.provider.listMessages(
          run.providerRunId,
          run.messageCursor,
        )
        await this.persistProviderMessages(userId, run.id, messages)

        if (providerRun.sessionId) {
          liveView = await this.provider.getLiveView(providerRun.sessionId)
        }
        const currentPage = liveView?.pages[0] ?? null
        const mappedStatus = mapProviderStatus(providerRun.status)
        run = await this.persistence.updateRun(userId, run.id, {
          status: mappedStatus,
          providerSessionId: providerRun.sessionId ?? null,
          messageCursor: messages.nextSince,
          currentUrl: currentPage?.url ?? null,
          currentTitle: currentPage?.title ?? null,
          resultSummary: sanitizeProviderText(providerRun.result),
          errorCode: providerRun.cause?.code ?? null,
          errorMessage: sanitizeProviderText(providerRun.cause?.message),
          endedAt: isActiveStatus(mappedStatus) ? null : new Date(),
        })
      } catch (error) {
        await this.persistProviderWarning(userId, run.id, error)
      }
    } else if (run.providerSessionId) {
      try {
        liveView = await this.provider.getLiveView(run.providerSessionId)
      } catch {
        liveView = null
      }
    }

    const events = await this.persistence.getRunEvents(userId, run.id)
    const currentPage = liveView?.pages[0]
      ? {
          title: liveView.pages[0].title,
          url: liveView.pages[0].url,
          faviconUrl: liveView.pages[0].faviconUrl,
        }
      : run.currentUrl || run.currentTitle
        ? {
            title: run.currentTitle,
            url: run.currentUrl,
            faviconUrl: null,
          }
        : null

    return {
      configured: true,
      loopEnabled: this.loopEnabled,
      heartbeatAt: new Date().toISOString(),
      run,
      liveView,
      currentPage,
      events,
    }
  }

  async startRun(userId: string, opportunityId?: string | null) {
    this.assertConfigured()
    const existing = await this.persistence.getActiveRun(userId)
    if (existing && isActiveStatus(existing.status)) {
      throw new AppError(
        409,
        'REVENUE_LIVE_RUN_ACTIVE',
        'A revenue live browser run is already active',
      )
    }

    const opportunity = await this.persistence.getOpportunityForLiveRun(
      userId,
      opportunityId,
    )
    if (!opportunity) {
      throw new AppError(
        404,
        'REVENUE_LIVE_OPPORTUNITY_NOT_FOUND',
        'No eligible revenue opportunity was found in the active workspace',
      )
    }

    const targetUrl = validateRevenueResearchUrl(opportunity.sourceUrl).toString()
    const task = buildRevenueResearchTask({
      title: opportunity.title,
      platform: opportunity.platform,
      sourceUrl: targetUrl,
    })
    const providerRun = await this.provider!.createRun(task)
    await this.persistence.createRun({
      userId,
      opportunityId: opportunity.id,
      providerRunId: providerRun.runId,
      status: mapProviderStatus(providerRun.status),
      taskSummary: `${opportunity.platform}: ${opportunity.title}`,
      targetUrl,
    })

    return this.getStatus(userId)
  }

  async stopRun(userId: string, runId: string) {
    this.assertConfigured()
    const run = await this.persistence.getActiveRun(userId)
    if (!run || run.id !== runId) {
      throw new AppError(
        404,
        'REVENUE_LIVE_RUN_NOT_FOUND',
        'Revenue live run was not found',
      )
    }

    if (run.providerSessionId) {
      await this.persistence.updateRun(userId, run.id, {
        status: 'STOP_REQUESTED',
      })
      await this.provider!.releaseSession(run.providerSessionId)
    }
    const stopped = await this.persistence.updateRun(userId, run.id, {
      status: 'STOPPED',
      endedAt: new Date(),
    })
    const events = await this.persistence.getRunEvents(userId, run.id)

    return {
      configured: true,
      loopEnabled: this.loopEnabled,
      heartbeatAt: new Date().toISOString(),
      run: stopped,
      liveView: null,
      currentPage: stopped.currentUrl || stopped.currentTitle
        ? {
            title: stopped.currentTitle,
            url: stopped.currentUrl,
            faviconUrl: null,
          }
        : null,
      events,
    }
  }

  async runNextEligibleOpportunity(userId: string) {
    const existing = await this.persistence.getActiveRun(userId)
    if (existing && isActiveStatus(existing.status)) return this.getStatus(userId)
    return this.startRun(userId)
  }

  private emptyStatus() {
    return {
      configured: this.configured,
      loopEnabled: this.loopEnabled,
      heartbeatAt: new Date().toISOString(),
      run: null,
      liveView: null,
      currentPage: null,
      events: [],
    }
  }

  private assertConfigured() {
    if (!this.configured || !this.provider) {
      throw new AppError(
        503,
        'REVENUE_LIVE_PROVIDER_NOT_CONFIGURED',
        'Cloud browser provider is not configured',
      )
    }
  }

  private async persistProviderMessages(
    userId: string,
    runId: string,
    messages: BrowserbaseRunMessages,
  ) {
    const events = messages.data.flatMap((item) => {
      const message = sanitizeProviderText(item.message.content)
      if (!message) return []
      return [
        {
          providerMessageId: item.id,
          kind: item.message.role.toUpperCase(),
          level: 'INFO',
          message,
          detail: null,
          occurredAt: parseDate(item.createdAt),
        },
      ]
    })
    if (events.length) await this.persistence.addEvents(userId, runId, events)
  }

  private async persistProviderWarning(
    userId: string,
    runId: string,
    error: unknown,
  ) {
    const message =
      error instanceof AppError
        ? error.message
        : 'Cloud browser status is temporarily unavailable'
    const minute = Math.floor(Date.now() / 60_000)
    await this.persistence.addEvents(userId, runId, [
      {
        providerMessageId: `provider-warning-${minute}`,
        kind: 'SYSTEM',
        level: 'WARNING',
        message,
        detail: null,
        occurredAt: new Date(),
      },
    ])
  }
}

function mapProviderStatus(status: BrowserbaseRun['status']): RevenueLiveRunStatus {
  switch (status) {
    case 'PENDING':
      return 'STARTING'
    case 'RUNNING':
      return 'RUNNING'
    case 'COMPLETED':
      return 'COMPLETED'
    case 'FAILED':
      return 'FAILED'
    case 'STOPPED':
      return 'STOPPED'
    case 'TIMED_OUT':
      return 'TIMED_OUT'
  }
}

function isActiveStatus(status: string) {
  return status === 'STARTING' || status === 'RUNNING' || status === 'STOP_REQUESTED'
}

function parseDate(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export function createRevenueLiveService() {
  const config = getRevenueLiveConfig()
  const provider = config.browserbaseApiKey
    ? new BrowserbaseAgentProvider({
        apiKey: config.browserbaseApiKey,
        baseUrl: config.browserbaseBaseUrl,
      })
    : null
  return new RevenueLiveService({
    provider,
    persistence: revenueLivePersistence,
    configured: config.providerConfigured,
    loopEnabled: config.loopEnabled,
  })
}

export const revenueLiveService = createRevenueLiveService()
