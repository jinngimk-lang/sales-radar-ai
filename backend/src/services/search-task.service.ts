import {
  LeadEvidenceStatus,
  LeadIdentityStatus,
  LeadQualificationStatus,
  SearchEvidenceExtractionStatus,
  type Platform,
  type Region,
} from '@prisma/client'
import { AppError } from '../utils/app-error.js'
import { ProviderError } from '../providers/errors/provider-error.js'
import { searchProviderFactory } from '../providers/search/provider.factory.js'
import type { SearchResult } from '../providers/search/search-provider.interface.js'
import { prisma } from '../prisma/client.js'
import { ensureDemoUser } from './demo-user.service.js'
import { leadNormalizer } from './lead-normalizer.service.js'
import { leadDeduplication } from './lead-deduplication.service.js'
import { searchEvidencePipeline } from './search-evidence-pipeline.service.js'
import {
  sanitizeProviderString,
  toSafeJson,
} from './safe-json.service.js'
import type {
  ProductContextSnapshot,
  SearchProductContext,
} from '../contracts/product-context.contract.js'
import type { SearchIntentSnapshot } from '../contracts/search-intent-snapshot.contract.js'
import { CURRENT_QUALIFICATION_VERSION } from '../contracts/qualification-version.contract.js'
import { opportunityDetection } from './opportunity-detection.service.js'
import { opportunityPersistence } from './opportunity-persistence.service.js'
import { captureMarketSignalsSafely } from './market-intelligence/market-intelligence.service.js'
import {
  providerHealthService,
  type ProviderHealth,
} from './provider-health.service.js'
import type { SearchProvider } from '../providers/search/search-provider.interface.js'

export type { SearchProductContext } from '../contracts/product-context.contract.js'

const SEARCH_PROVIDER_UNAVAILABLE_MESSAGE =
  'The search service is temporarily unavailable. Please try again later.'

export interface CreateSearchTaskInput {
  userId?: string
  productProfileId?: string
  keyword: string
  platforms: Platform[]
  regions: Region[]
  productContextSnapshot?: ProductContextSnapshot
  searchIntentSnapshot?: SearchIntentSnapshot
}

export async function createSearchTask(input: CreateSearchTaskInput) {
  const userId = input.userId ?? (await ensureDemoUser()).id

  return prisma.searchTask.create({
    data: {
      userId,
      productProfileId: input.productProfileId,
      keyword: input.keyword,
      platforms: input.platforms,
      regions: input.regions,
      provider: 'agent-reach',
      status: 'PENDING',
      parameters: input.productContextSnapshot || input.searchIntentSnapshot
        ? toSafeJson({
            productContext: input.productContextSnapshot?.context,
            productContextSnapshot: input.productContextSnapshot,
            searchIntentSnapshot: input.searchIntentSnapshot,
          })
        : undefined,
    },
  })
}

export interface SearchTaskExecutionDependencies {
  checkProviderHealth: (
    provider: string,
  ) => Promise<ProviderHealth | null>
  resolveProvider: (provider: unknown) => SearchProvider
}

const defaultExecutionDependencies: SearchTaskExecutionDependencies = {
  checkProviderHealth: async (provider) =>
    provider === 'agent-reach'
      ? providerHealthService.checkAgentReach()
      : null,
  resolveProvider: (provider) => searchProviderFactory.resolve(provider),
}

export async function processSearchTask(
  taskId: string,
  dependencies: SearchTaskExecutionDependencies = defaultExecutionDependencies,
): Promise<void> {
  const task = await prisma.searchTask.update({
    where: { id: taskId },
    data: {
      status: 'RUNNING',
      progress: 10,
      startedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    },
  })

  try {
    const providerHealth = await dependencies.checkProviderHealth(task.provider)
    if (providerHealth) {
      await recordProviderExecution(task.id, task.parameters, {
        provider: task.provider,
        health: {
          state: providerHealth.state,
          code: providerHealth.code,
          checkedAt: providerHealth.checkedAt,
        },
      })

      if (providerHealth.state !== 'AVAILABLE') {
        await prisma.searchTask.update({
          where: { id: task.id },
          data: {
            status: 'FAILED',
            retryCount: { increment: 1 },
            errorCode: 'SEARCH_PROVIDER_UNAVAILABLE',
            errorMessage: SEARCH_PROVIDER_UNAVAILABLE_MESSAGE,
            completedAt: new Date(),
          },
        })
        console.warn(
          `[SearchTaskService] Search task ${task.id} stopped because ${task.provider} health is ${providerHealth.state} (${providerHealth.code}).`,
        )
        return
      }
    }

    const provider = dependencies.resolveProvider(task.provider)
    const providerResults = await provider.search({
      keyword: task.keyword,
      platforms: task.platforms,
      regions: task.regions,
    })
    console.info(
      `[SearchTaskService] Provider execution completed: task=${task.id}, provider=${provider.name}, adapterResults=${providerResults.length}.`,
    )
    const productContext = readProductContext(task.parameters)
    let qualifiedCount = 0
    let opportunityCount = 0
    let marketSignalCount = 0

    for (const result of providerResults) {
      const title =
        typeof result.metadata.title === 'string'
          ? result.metadata.title.trim()
          : null
      const evidenceMetadata = toSafeJson({
        ...result.metadata,
        customerName: result.customerName,
        country: result.country,
        region: result.region,
        industry: result.industry,
      })
      const evidence = await prisma.searchEvidence.upsert({
        where: {
          searchTaskId_provider_externalId: {
            searchTaskId: task.id,
            provider: provider.name,
            externalId: result.externalId,
          },
        },
        create: {
          searchTaskId: task.id,
          provider: provider.name,
          externalId: result.externalId,
          platform: result.platform,
          rawUrl: sanitizeProviderString(result.sourceUrl),
          profileUrl: sanitizeProviderString(result.profileUrl),
          title: title ? sanitizeProviderString(title) : null,
          content: sanitizeProviderString(result.rawContent),
          rawMetadata: evidenceMetadata,
          extractionStatus: SearchEvidenceExtractionStatus.PENDING,
          qualificationVersion: CURRENT_QUALIFICATION_VERSION,
        },
        update: {
          platform: result.platform,
          rawUrl: sanitizeProviderString(result.sourceUrl),
          profileUrl: sanitizeProviderString(result.profileUrl),
          title: title ? sanitizeProviderString(title) : null,
          content: sanitizeProviderString(result.rawContent),
          rawMetadata: evidenceMetadata,
          extractionStatus: SearchEvidenceExtractionStatus.PENDING,
          qualificationVersion: CURRENT_QUALIFICATION_VERSION,
          leadId: null,
        },
      })

      const marketSignals = await captureMarketSignalsSafely({
        userId: task.userId,
        provider: provider.name,
        result,
      })
      marketSignalCount += marketSignals.length

      if (productContext) {
        try {
          const created = await detectAndPersistSearchOpportunity({
            userId: task.userId,
            searchTaskId: task.id,
            searchEvidenceId: evidence.id,
            providerName: provider.name,
            result,
            title,
            rawMetadata: evidenceMetadata,
            productContext,
          })
          if (created) opportunityCount += 1
        } catch (error) {
          console.error(
            `[SearchTaskService] Opportunity detection failed for evidence ${evidence.id}:`,
            error,
          )
        }
      }

      try {
        const evaluation = searchEvidencePipeline.evaluate(
          result,
          productContext,
        )
        const qualifiedResult = searchEvidencePipeline.qualifyResult(
          result,
          evaluation,
        )

        if (!qualifiedResult) {
          await prisma.searchEvidence.update({
            where: { id: evidence.id },
            data: {
              extractionStatus: SearchEvidenceExtractionStatus.REJECTED,
              companyName: evaluation.identity.companyName,
              normalizedDomain: evaluation.identity.normalizedDomain,
              website: evaluation.identity.website,
              identityConfidence: evaluation.identity.confidence,
              identityReasoning: toSafeJson(
                evaluation.identity.confidenceReasoning,
              ),
              identityStatus: evaluation.identity.identityStatus,
              evidenceStatus: evaluation.evidence.status,
              productRelevancePassed: evaluation.relevance.passed,
              qualificationStatus: evaluation.gate.qualificationStatus,
              qualificationVersion: evaluation.gate.qualificationVersion,
              qualificationReasons: toSafeJson(evaluation.gate.reasons),
            },
          })
          continue
        }

        const lead = leadNormalizer.normalize(qualifiedResult, provider.name)
        await prisma.$transaction(async (transaction) => {
          const duplicate = await leadDeduplication.findDuplicate(
            {
              userId: task.userId,
              provider: lead.provider,
              externalId: lead.externalId,
              sourceUrl: lead.sourceUrl,
              sourceMetadata: lead.sourceMetadata,
            },
            transaction,
          )
          const trustedData = {
            company: evaluation.identity.companyName!,
            normalizedDomain: evaluation.identity.normalizedDomain!,
            identityStatus: LeadIdentityStatus.VERIFIED,
            evidenceStatus: LeadEvidenceStatus.VALID,
            productRelevancePassed: true,
            qualificationStatus: LeadQualificationStatus.QUALIFIED,
            qualificationVersion: evaluation.gate.qualificationVersion,
          }
          const storedLead = duplicate
            ? await transaction.lead.update({
                where: { id: duplicate.id },
                data: {
                  ...trustedData,
                  searchTaskId: task.id,
                  sourceMetadata: toSafeJson(lead.sourceMetadata),
                },
              })
            : await transaction.lead.create({
                data: {
                  ...lead,
                  ...trustedData,
                  sourceMetadata: toSafeJson(lead.sourceMetadata),
                  username: sanitizeProviderString(lead.username),
                  displayName: sanitizeProviderString(lead.displayName),
                  postContent: sanitizeProviderString(lead.postContent),
                  country: sanitizeProviderString(lead.country),
                  jobTitle: lead.jobTitle
                    ? sanitizeProviderString(lead.jobTitle)
                    : undefined,
                  sourceUrl: sanitizeProviderString(lead.sourceUrl),
                  profileUrl: sanitizeProviderString(lead.profileUrl),
                  userId: task.userId,
                  searchTaskId: task.id,
                },
              })

          await transaction.searchTaskLead.upsert({
            where: {
              searchTaskId_leadId: {
                searchTaskId: task.id,
                leadId: storedLead.id,
              },
            },
            create: {
              searchTaskId: task.id,
              leadId: storedLead.id,
              rankScore: lead.intentScore,
              matchReason: 'Qualified by the SearchEvidence quality gate.',
              matchEvidence: toSafeJson({
                searchEvidenceId: evidence.id,
                sourceUrl: lead.sourceUrl,
                provider: lead.provider,
                companyName: evaluation.identity.companyName,
                normalizedDomain: evaluation.identity.normalizedDomain,
              }),
            },
            update: {
              rankScore: lead.intentScore,
              matchReason: 'Qualified by the SearchEvidence quality gate.',
              matchEvidence: toSafeJson({
                searchEvidenceId: evidence.id,
                sourceUrl: lead.sourceUrl,
                provider: lead.provider,
                companyName: evaluation.identity.companyName,
                normalizedDomain: evaluation.identity.normalizedDomain,
              }),
            },
          })

          await transaction.searchEvidence.update({
            where: { id: evidence.id },
            data: {
              leadId: storedLead.id,
              extractionStatus: SearchEvidenceExtractionStatus.PROCESSED,
              companyName: evaluation.identity.companyName,
              normalizedDomain: evaluation.identity.normalizedDomain,
              website: evaluation.identity.website,
              identityConfidence: evaluation.identity.confidence,
              identityReasoning: toSafeJson(
                evaluation.identity.confidenceReasoning,
              ),
              identityStatus: LeadIdentityStatus.VERIFIED,
              evidenceStatus: LeadEvidenceStatus.VALID,
              productRelevancePassed: true,
              qualificationStatus: LeadQualificationStatus.QUALIFIED,
              qualificationVersion: evaluation.gate.qualificationVersion,
              qualificationReasons: toSafeJson([]),
            },
          })
        })
        qualifiedCount += 1
      } catch (error) {
        await prisma.searchEvidence.update({
          where: { id: evidence.id },
          data: {
            extractionStatus: SearchEvidenceExtractionStatus.FAILED,
            qualificationReasons: toSafeJson([
              error instanceof Error
                ? error.message
                : 'Unknown evidence processing error',
            ]),
          },
        })
        console.error(
          `[SearchTaskService] Evidence processing failed for ${evidence.id}; continuing task:`,
          error,
        )
      }
    }

    console.info(
      `[SearchTaskService] ${provider.name} task outcome: adapterResults=${providerResults.length}, evidence=${providerResults.length}, marketSignals=${marketSignalCount}, opportunities=${opportunityCount}, resultCountQualifiedLeads=${qualifiedCount}.`,
    )
    await prisma.searchTask.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        progress: 100,
        resultCount: qualifiedCount,
        completedAt: new Date(),
      },
    })
  } catch (error) {
    const errorCode =
      error instanceof ProviderError ? error.code : 'SEARCH_TASK_FAILED'
    const errorMessage = userFacingSearchError(error)

    await recordProviderExecution(task.id, task.parameters, {
      provider: task.provider,
      failure: {
        code: errorCode,
        message: errorMessage,
        failedAt: new Date().toISOString(),
      },
    })

    await prisma.searchTask.update({
      where: { id: task.id },
      data: {
        status: 'FAILED',
        retryCount: { increment: 1 },
        errorCode,
        errorMessage,
        completedAt: new Date(),
      },
    })

    console.error(
      `[SearchTaskService] Search task ${task.id} execution failed:`,
      error,
    )
    throw error
  }
}

interface ProviderExecutionRecord {
  provider: string
  health?: {
    state: ProviderHealth['state']
    code: string
    checkedAt: string
  }
  failure?: {
    code: string
    message: string
    failedAt: string
  }
}

async function recordProviderExecution(
  taskId: string,
  parameters: unknown,
  execution: ProviderExecutionRecord,
): Promise<void> {
  const storedTask = await prisma.searchTask.findUnique({
    where: { id: taskId },
    select: { parameters: true },
  })
  const latestParameters = storedTask?.parameters ?? parameters
  const currentParameters =
    latestParameters &&
    typeof latestParameters === 'object' &&
    !Array.isArray(latestParameters)
      ? (latestParameters as Record<string, unknown>)
      : {}
  const currentExecution =
    currentParameters.providerExecution &&
    typeof currentParameters.providerExecution === 'object' &&
    !Array.isArray(currentParameters.providerExecution)
      ? (currentParameters.providerExecution as Record<string, unknown>)
      : {}

  await prisma.searchTask.update({
    where: { id: taskId },
    data: {
      parameters: toSafeJson({
        ...currentParameters,
        providerExecution: {
          ...currentExecution,
          ...execution,
        },
      }),
    },
  })
}

function userFacingSearchError(error: unknown): string {
  if (!(error instanceof ProviderError)) {
    return 'The search could not be completed. Please try again later.'
  }

  switch (error.code) {
    case 'TIMEOUT':
      return 'The search took too long to complete. Please try again.'
    case 'RATE_LIMIT':
      return 'The search service is temporarily busy. Please try again later.'
    case 'AUTH_ERROR':
      return SEARCH_PROVIDER_UNAVAILABLE_MESSAGE
    case 'INVALID_RESPONSE':
      return 'The search service returned an unreadable response. Please try again.'
  }
}

interface DetectSearchOpportunityInput {
  userId: string
  searchTaskId: string
  searchEvidenceId: string
  providerName: string
  result: SearchResult
  title: string | null
  rawMetadata: unknown
  productContext: SearchProductContext
}

interface SearchOpportunityDependencies {
  detect: (
    input: Parameters<typeof opportunityDetection.detect>[0],
  ) => ReturnType<typeof opportunityDetection.detect>
  persist: typeof opportunityPersistence.persist
}

export async function detectAndPersistSearchOpportunity(
  input: DetectSearchOpportunityInput,
  dependencies: SearchOpportunityDependencies = {
    detect: (candidate) => opportunityDetection.detect(candidate),
    persist: (candidate) => opportunityPersistence.persist(candidate),
  },
): Promise<boolean> {
  const detection = dependencies.detect({
    provider: input.providerName,
    sourceUrl: input.result.sourceUrl,
    title: input.title,
    content: input.result.rawContent,
    rawMetadata: input.rawMetadata,
    explicitCompanyName: input.result.company,
    productContext: input.productContext,
  })
  if (!detection) return false

  await dependencies.persist({
    userId: input.userId,
    searchTaskId: input.searchTaskId,
    searchEvidenceId: input.searchEvidenceId,
    productContext: input.productContext,
    detection,
  })
  return true
}

function readProductContext(value: unknown): SearchProductContext | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const parameters = value as Record<string, unknown>
  const snapshot = parameters.productContextSnapshot
  const snapshotContext =
    snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
      ? (snapshot as Record<string, unknown>).context
      : undefined
  const productContext = snapshotContext ?? parameters.productContext
  if (
    !productContext ||
    typeof productContext !== 'object' ||
    Array.isArray(productContext)
  ) {
    return undefined
  }
  const source = productContext as Record<string, unknown>
  const context: SearchProductContext = {}
  for (const key of [
    'product',
    'category',
    'industry',
    'region',
    'country',
    'customerType',
    'businessProblem',
  ] as const) {
    const field = source[key]
    if (typeof field === 'string' && field.trim()) {
      context[key] = field.trim()
    }
  }
  for (const key of [
    'applications',
    'buyingSignals',
    'buyerKeywords',
    'channelKeywords',
  ] as const) {
    const values = source[key]
    if (
      Array.isArray(values) &&
      values.every((value) => typeof value === 'string')
    ) {
      context[key] = values.map((value) => value.trim()).filter(Boolean)
    }
  }
  return Object.values(context).some(Boolean) ? context : undefined
}

type ActiveUserResolver = () => Promise<{ id: string }>

export async function getSearchTask(
  id: string,
  resolveUser: ActiveUserResolver = ensureDemoUser,
) {
  const user = await resolveUser()
  return prisma.searchTask.findFirst({
    where: { id, userId: user.id },
  })
}

export async function getSearchTaskResults(
  id: string,
  resolveUser: ActiveUserResolver = ensureDemoUser,
) {
  const user = await resolveUser()
  const task = await prisma.searchTask.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true },
  })

  if (!task) {
    throw new AppError(
      404,
      'SEARCH_TASK_NOT_FOUND',
      'Search task not found',
    )
  }

  if (task.status === 'FAILED' || task.status === 'CANCELLED') {
    return []
  }

  const links = await prisma.searchTaskLead.findMany({
    where: {
      searchTaskId: task.id,
      searchTask: { userId: user.id },
    },
    include: {
      lead: {
        include: {
          analyses: {
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ rankScore: 'desc' }, { createdAt: 'asc' }],
  })

  return links.map(({ lead, rankScore, matchReason, matchEvidence }) => {
    const { analyses, ...storedLead } = lead
    return {
      ...storedLead,
      analysis: analyses[0] ?? null,
      searchMatch: {
        rankScore,
        reason: matchReason,
        evidence: matchEvidence,
      },
    }
  })
}

export async function getSearchTaskOpportunities(
  id: string,
  resolveUser: ActiveUserResolver = ensureDemoUser,
) {
  const user = await resolveUser()
  const task = await prisma.searchTask.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true },
  })

  if (!task) {
    throw new AppError(
      404,
      'SEARCH_TASK_NOT_FOUND',
      'Search task not found',
    )
  }

  if (task.status === 'FAILED' || task.status === 'CANCELLED') {
    return []
  }

  return prisma.opportunity.findMany({
    where: {
      searchTaskId: task.id,
      userId: user.id,
      integrityStatus: 'EVIDENCE_LINKED',
      evidence: {
        some: {},
      },
    },
    include: {
      evidence: {
        select: {
          id: true,
          excerpt: true,
          isPrimary: true,
          confidence: true,
          searchEvidence: {
            select: {
              id: true,
              rawUrl: true,
              title: true,
              provider: true,
              platform: true,
            },
          },
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
  })
}
