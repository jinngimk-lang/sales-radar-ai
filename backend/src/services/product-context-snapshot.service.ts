import type { Prisma } from '@prisma/client'
import {
  PRODUCT_CONTEXT_SNAPSHOT_VERSION,
  type ProductContextSnapshot,
  type ProductContextSource,
  type SearchProductContext,
} from '../contracts/product-context.contract.js'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { ensureDemoUser } from './demo-user.service.js'

interface ProductProfileContextSource {
  id: string
  productName: string
  category: string
  industry: string
  applications: string[]
  buyerPersona: Prisma.JsonValue
  buyerKeywords: string[]
  channelKeywords: string[]
  targetCountries: string[]
  buyingSignals: string[]
  painPoints: string[]
  updatedAt: Date
}

export interface PreparedProductContext {
  userId: string
  productProfile: ProductProfileContextSource | null
  requestedContext?: SearchProductContext
  context: SearchProductContext
}

export interface ProductContextRepository {
  findOwnedProfile(
    id: string,
    userId: string,
  ): Promise<ProductProfileContextSource | null>
}

const productContextRepository: ProductContextRepository = {
  findOwnedProfile: (id, userId) =>
    prisma.productProfile.findFirst({
      where: { id, userId },
      select: {
        id: true,
        productName: true,
        category: true,
        industry: true,
        applications: true,
        buyerPersona: true,
        buyerKeywords: true,
        channelKeywords: true,
        targetCountries: true,
        buyingSignals: true,
        painPoints: true,
        updatedAt: true,
      },
    }),
}

type UserResolver = () => Promise<{ id: string }>
type Clock = () => Date

export class ProductContextSnapshotBuilder {
  constructor(
    private readonly repository: ProductContextRepository =
      productContextRepository,
    private readonly resolveUser: UserResolver = ensureDemoUser,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async prepare(input: {
    productProfileId?: string
    requestedContext?: SearchProductContext
  }): Promise<PreparedProductContext> {
    const user = await this.resolveUser()
    const productProfile = input.productProfileId
      ? await this.repository.findOwnedProfile(input.productProfileId, user.id)
      : null

    if (input.productProfileId && !productProfile) {
      throw new AppError(
        404,
        'PRODUCT_PROFILE_NOT_FOUND',
        'Product profile not found',
      )
    }

    return {
      userId: user.id,
      productProfile,
      requestedContext: cleanContext(input.requestedContext),
      context: mergeContexts(
        profileToContext(productProfile),
        input.requestedContext,
      ),
    }
  }

  build(
    prepared: PreparedProductContext,
    inferredContext?: SearchProductContext,
  ): ProductContextSnapshot {
    const context = mergeContexts(
      inferredContext,
      profileToContext(prepared.productProfile),
      prepared.requestedContext,
    )
    return {
      version: PRODUCT_CONTEXT_SNAPSHOT_VERSION,
      capturedAt: this.clock().toISOString(),
      source: contextSource(
        Boolean(prepared.productProfile),
        Boolean(prepared.requestedContext),
      ),
      productProfile: prepared.productProfile
        ? {
            id: prepared.productProfile.id,
            productName: prepared.productProfile.productName,
            updatedAt: prepared.productProfile.updatedAt.toISOString(),
          }
        : null,
      context,
    }
  }
}

function profileToContext(
  profile: ProductProfileContextSource | null,
): SearchProductContext | undefined {
  if (!profile) return undefined
  const persona = firstBuyerPersona(profile.buyerPersona)
  const country =
    profile.targetCountries.length === 1
      ? cleanString(profile.targetCountries[0])
      : undefined
  return cleanContext({
    product: profile.productName,
    category: profile.category,
    industry: profile.industry,
    applications: profile.applications,
    country,
    customerType: persona?.customerType,
    businessProblem:
      profile.painPoints.length > 0
        ? profile.painPoints.slice(0, 3).join('; ')
        : undefined,
    buyingSignals: profile.buyingSignals,
    buyerKeywords: profile.buyerKeywords,
    channelKeywords: profile.channelKeywords,
  })
}

function firstBuyerPersona(
  value: Prisma.JsonValue,
): Record<string, string> | undefined {
  if (!Array.isArray(value)) return undefined
  const first = value.find(
    (item) => item && typeof item === 'object' && !Array.isArray(item),
  )
  if (!first || Array.isArray(first)) return undefined
  const customerType = cleanString(
    (first as Record<string, Prisma.JsonValue>).customerType,
  )
  return customerType ? { customerType } : undefined
}

function mergeContexts(
  ...contexts: Array<SearchProductContext | undefined>
): SearchProductContext {
  const merged: SearchProductContext = {}
  for (const context of contexts) {
    const cleaned = cleanContext(context)
    if (!cleaned) continue
    Object.assign(merged, cleaned)
  }
  return merged
}

function cleanContext(
  context: SearchProductContext | undefined,
): SearchProductContext | undefined {
  if (!context) return undefined
  const cleaned: SearchProductContext = {}
  for (const field of [
    'product',
    'category',
    'customerType',
    'industry',
    'region',
    'country',
    'businessProblem',
  ] as const) {
    const value = cleanString(context[field])
    if (value && value !== 'Unknown') cleaned[field] = value
  }
  for (const field of [
    'applications',
    'buyingSignals',
    'buyerKeywords',
    'channelKeywords',
  ] as const) {
    if (!Array.isArray(context[field])) continue
    const values = context[field]
      .map(cleanString)
      .filter((value): value is string => Boolean(value))
    if (values.length > 0) cleaned[field] = [...new Set(values)]
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : undefined
}

function contextSource(
  hasProfile: boolean,
  hasRequest: boolean,
): ProductContextSource {
  if (hasProfile && hasRequest) return 'combined'
  if (hasProfile) return 'product_profile'
  if (hasRequest) return 'request'
  return 'inferred'
}

export const productContextSnapshotBuilder =
  new ProductContextSnapshotBuilder()
