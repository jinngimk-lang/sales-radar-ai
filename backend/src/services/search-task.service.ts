import type { Platform, Region } from '@prisma/client'
import { ProviderError } from '../providers/errors/provider-error.js'
import { searchProviderFactory } from '../providers/search/provider.factory.js'
import { prisma } from '../prisma/client.js'
import { ensureDemoUser } from './demo-user.service.js'
import { leadExtractor } from './lead-extractor.service.js'
import { leadNormalizer } from './lead-normalizer.service.js'
import { leadDeduplication } from './lead-deduplication.service.js'
import {
  sanitizeProviderString,
  toSafeJson,
} from './safe-json.service.js'

export interface CreateSearchTaskInput {
  keyword: string
  platforms: Platform[]
  regions: Region[]
}

export async function createSearchTask(input: CreateSearchTaskInput) {
  const user = await ensureDemoUser()

  return prisma.searchTask.create({
    data: {
      userId: user.id,
      keyword: input.keyword,
      platforms: input.platforms,
      regions: input.regions,
      provider: 'agent-reach',
      status: 'PENDING',
    },
  })
}

export async function processSearchTask(taskId: string): Promise<void> {
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
    const provider = searchProviderFactory.resolve(task.provider)
    const providerResults = await provider.search({
      keyword: task.keyword,
      platforms: task.platforms,
      regions: task.regions,
    })
    const extractedResults = leadExtractor.extractMany(providerResults)
    const normalizedLeads = leadNormalizer.normalizeMany(
      extractedResults,
      provider.name,
    )
    console.info(
      `[SearchTaskService] ${provider.name} results: raw=${providerResults.length}, extracted=${extractedResults.length}, normalized=${normalizedLeads.length}`,
    )
    if (normalizedLeads[0]) {
      const firstLead = normalizedLeads[0]
      console.info(
        '[SearchTaskService] first normalized Lead:',
        JSON.stringify(
          {
            externalId: firstLead.externalId,
            username: firstLead.username,
            displayName: firstLead.displayName,
            company: firstLead.company,
            jobTitle: firstLead.jobTitle,
            platform: firstLead.platform,
            country: firstLead.country,
            sourceUrl: firstLead.sourceUrl,
            profileUrl: firstLead.profileUrl,
            postContent: firstLead.postContent.slice(0, 500),
            intentScore: firstLead.intentScore,
            recommendedAction: firstLead.recommendedAction,
            sourceMetadata: firstLead.sourceMetadata,
          },
          null,
          2,
        ),
      )
    }

    await prisma.$transaction(async (transaction) => {
      let createdCount = 0

      for (const lead of normalizedLeads) {
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
        if (duplicate) continue

        await transaction.lead.create({
          data: {
            ...lead,
            sourceMetadata: toSafeJson(lead.sourceMetadata),
            username: sanitizeProviderString(lead.username),
            displayName: sanitizeProviderString(lead.displayName),
            postContent: sanitizeProviderString(lead.postContent),
            country: sanitizeProviderString(lead.country),
            jobTitle: lead.jobTitle
              ? sanitizeProviderString(lead.jobTitle)
              : undefined,
            company: lead.company
              ? sanitizeProviderString(lead.company)
              : undefined,
            sourceUrl: sanitizeProviderString(lead.sourceUrl),
            profileUrl: sanitizeProviderString(lead.profileUrl),
            userId: task.userId,
            searchTaskId: task.id,
          },
        })
        createdCount += 1
      }

      await transaction.searchTask.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          resultCount: createdCount,
          completedAt: new Date(),
        },
      })
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown search task error'
    const errorCode =
      error instanceof ProviderError ? error.code : 'SEARCH_TASK_FAILED'

    await prisma.searchTask.update({
      where: { id: task.id },
      data: {
        status: 'FAILED',
        retryCount: { increment: 1 },
        errorCode,
        errorMessage: message,
        completedAt: new Date(),
      },
    })

    throw error
  }
}

export function getSearchTask(id: string) {
  return prisma.searchTask.findUnique({
    where: { id },
    include: {
      leads: {
        orderBy: { intentScore: 'desc' },
      },
    },
  })
}
