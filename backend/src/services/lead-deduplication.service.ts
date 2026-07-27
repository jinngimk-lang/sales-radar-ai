import { Prisma, type Lead } from '@prisma/client'
import { prisma } from '../prisma/client.js'

type LeadLookupClient = Pick<Prisma.TransactionClient, 'lead'>

export interface LeadDeduplicationInput {
  userId: string
  provider: string
  externalId: string
  sourceUrl: string
  sourceMetadata?: Prisma.InputJsonValue | null
}

export class LeadDeduplicationService {
  async findDuplicate(
    input: LeadDeduplicationInput,
    client: LeadLookupClient = prisma,
  ): Promise<Lead | null> {
    const externalIdMatch = await client.lead.findUnique({
      where: {
        userId_provider_externalId: {
          userId: input.userId,
          provider: input.provider,
          externalId: input.externalId,
        },
      },
    })
    if (externalIdMatch) return externalIdMatch

    if (!this.isMultiCandidateExtraction(input.sourceMetadata)) {
      const sourceUrlMatch = await client.lead.findFirst({
        where: {
          userId: input.userId,
          sourceUrl: input.sourceUrl,
        },
      })
      if (sourceUrlMatch) return sourceUrlMatch
    }

    const companyDomain = this.readCompanyDomain(input.sourceMetadata)
    if (!companyDomain) return null

    return client.lead.findFirst({
      where: {
        userId: input.userId,
        sourceMetadata: {
          path: ['companyDomain'],
          equals: companyDomain,
        },
      },
    })
  }

  private readCompanyDomain(
    sourceMetadata: Prisma.InputJsonValue | null | undefined,
  ): string | null {
    if (
      !sourceMetadata ||
      typeof sourceMetadata !== 'object' ||
      Array.isArray(sourceMetadata)
    ) {
      return null
    }

    const metadata = sourceMetadata as Record<string, unknown>
    const value = metadata.companyDomain
    if (typeof value !== 'string' || !value.trim()) return null

    const candidate = value.trim().toLowerCase()
    try {
      const url = new URL(
        candidate.includes('://') ? candidate : `https://${candidate}`,
      )
      return url.hostname.replace(/^www\./, '')
    } catch {
      return null
    }
  }

  private isMultiCandidateExtraction(
    sourceMetadata: Prisma.InputJsonValue | null | undefined,
  ): boolean {
    if (
      !sourceMetadata ||
      typeof sourceMetadata !== 'object' ||
      Array.isArray(sourceMetadata)
    ) {
      return false
    }

    const metadata = sourceMetadata as Record<string, unknown>
    const extraction = metadata.extraction
    if (!extraction || typeof extraction !== 'object' || Array.isArray(extraction)) {
      return false
    }

    return (
      typeof (extraction as Record<string, unknown>).candidateCount ===
        'number' &&
      ((extraction as Record<string, unknown>).candidateCount as number) > 1
    )
  }
}

export const leadDeduplication = new LeadDeduplicationService()
