import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client.js'
import type { ProductUnderstandingResult } from '../providers/product-understanding/product-understanding-provider.interface.js'
import { AppError } from '../utils/app-error.js'
import { ensureDemoUser } from './demo-user.service.js'
import { productUnderstanding } from './product-understanding.service.js'
import { toSafeJson } from './safe-json.service.js'

export interface ProductProfileData {
  productName: string
  category: string
  industry: string
  applications: string[]
  keywords: string[]
  relatedProducts: string[]
  buyerPersona: Prisma.InputJsonValue
  decisionMakerRoles: Prisma.InputJsonValue
  buyerKeywords: string[]
  channelKeywords: string[]
  targetCountries: string[]
  targetLanguages: string[]
  recommendedPlatforms: string[]
  buyingSignals: string[]
  painPoints: string[]
  valueAngles: string[]
}

export type ProductProfileUpdate = Partial<ProductProfileData>

export interface ProductIntelligenceRepository {
  findDuplicate(userId: string, productName: string): Promise<unknown | null>
  create(userId: string, data: ProductProfileData): Promise<unknown>
  list(userId: string): Promise<unknown[]>
  findById(id: string, userId: string): Promise<unknown | null>
  update(
    id: string,
    userId: string,
    data: ProductProfileUpdate,
  ): Promise<unknown>
}

const prismaProductRepository: ProductIntelligenceRepository = {
  findDuplicate: (userId, productName) =>
    prisma.productProfile.findFirst({
      where: {
        userId,
        productName: { equals: productName, mode: 'insensitive' },
      },
    }),
  create: (userId, data) =>
    prisma.productProfile.create({
      data: {
        userId,
        ...data,
        buyerPersona: toSafeJson(data.buyerPersona),
        decisionMakerRoles: toSafeJson(data.decisionMakerRoles),
      },
    }),
  list: (userId) =>
    prisma.productProfile.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    }),
  findById: (id, userId) =>
    prisma.productProfile.findFirst({ where: { id, userId } }),
  update: (id, userId, data) =>
    prisma.productProfile.update({
      where: { id, userId },
      data: {
        ...data,
        buyerPersona:
          data.buyerPersona === undefined
            ? undefined
            : toSafeJson(data.buyerPersona),
        decisionMakerRoles:
          data.decisionMakerRoles === undefined
            ? undefined
            : toSafeJson(data.decisionMakerRoles),
      },
    }),
}

type ProductAnalyzer = (query: string) => Promise<ProductUnderstandingResult>
type UserResolver = () => Promise<{ id: string }>

export class ProductIntelligenceService {
  constructor(
    private readonly repository: ProductIntelligenceRepository =
      prismaProductRepository,
    private readonly analyzer: ProductAnalyzer = async (query) =>
      productUnderstanding.understand(query),
    private readonly resolveUser: UserResolver = ensureDemoUser,
  ) {}

  async create(query: string): Promise<unknown> {
    const user = await this.resolveUser()
    const understanding = await this.analyzer(query)
    const data = this.toProfileData(understanding)
    const duplicate = await this.repository.findDuplicate(
      user.id,
      data.productName,
    )
    if (duplicate) return duplicate
    return this.repository.create(user.id, data)
  }

  async list(): Promise<unknown[]> {
    const user = await this.resolveUser()
    return this.repository.list(user.id)
  }

  async get(id: string): Promise<unknown> {
    const user = await this.resolveUser()
    const profile = await this.repository.findById(id, user.id)
    if (!profile) {
      throw new AppError(404, 'PRODUCT_PROFILE_NOT_FOUND', 'Product profile not found')
    }
    return profile
  }

  async update(id: string, data: ProductProfileUpdate): Promise<unknown> {
    const user = await this.resolveUser()
    const profile = await this.repository.findById(id, user.id)
    if (!profile) {
      throw new AppError(404, 'PRODUCT_PROFILE_NOT_FOUND', 'Product profile not found')
    }
    return this.repository.update(id, user.id, this.cleanUpdate(data))
  }

  async analyze(id: string): Promise<unknown> {
    const user = await this.resolveUser()
    const profile = await this.repository.findById(id, user.id)
    if (!profile || !this.hasProductName(profile)) {
      throw new AppError(404, 'PRODUCT_PROFILE_NOT_FOUND', 'Product profile not found')
    }
    const understanding = await this.analyzer(profile.productName)
    return this.repository.update(
      id,
      user.id,
      this.toProfileData(understanding),
    )
  }

  async getBuyerStrategy(productId: string): Promise<{
    productId: string
    productName: string
    buyerPersona: Prisma.InputJsonValue
    recommendedRoles: Prisma.InputJsonValue
    keywords: string[]
    countries: string[]
    languages: string[]
    platforms: string[]
    buyingSignals: string[]
    painPoints: string[]
    valueAngles: string[]
  }> {
    const profile = this.asProfile(await this.get(productId))
    return {
      productId,
      productName: profile.productName,
      buyerPersona: profile.buyerPersona,
      recommendedRoles: profile.decisionMakerRoles,
      keywords: profile.buyerKeywords,
      countries: profile.targetCountries,
      languages: profile.targetLanguages,
      platforms: profile.recommendedPlatforms,
      buyingSignals: profile.buyingSignals,
      painPoints: profile.painPoints,
      valueAngles: profile.valueAngles,
    }
  }

  async getChannelStrategy(productId: string): Promise<{
    productId: string
    productName: string
    keywords: string[]
    countries: string[]
    languages: string[]
    platforms: string[]
    valueAngles: string[]
  }> {
    const profile = this.asProfile(await this.get(productId))
    return {
      productId,
      productName: profile.productName,
      keywords: profile.channelKeywords,
      countries: profile.targetCountries,
      languages: profile.targetLanguages,
      platforms: profile.recommendedPlatforms,
      valueAngles: profile.valueAngles,
    }
  }

  private toProfileData(
    result: ProductUnderstandingResult,
  ): ProductProfileData {
    return {
      productName: result.productUnderstanding.productName,
      category: result.productUnderstanding.category,
      industry: result.productUnderstanding.industry,
      applications: result.productUnderstanding.applications,
      keywords: result.productUnderstanding.keywords,
      relatedProducts: result.productUnderstanding.relatedProducts,
      buyerPersona: toSafeJson(result.buyerPersona),
      decisionMakerRoles: toSafeJson(result.recommendedRoles),
      buyerKeywords: result.searchStrategy.buyerKeywords,
      channelKeywords: result.searchStrategy.channelKeywords,
      targetCountries: result.searchStrategy.countries,
      targetLanguages: result.searchStrategy.languages,
      recommendedPlatforms: result.searchStrategy.recommendedPlatforms,
      buyingSignals: result.salesPreparation.buyingSignals,
      painPoints: result.salesPreparation.customerPainPoints,
      valueAngles: [result.salesPreparation.recommendedValueAngle],
    }
  }

  private cleanUpdate(data: ProductProfileUpdate): ProductProfileUpdate {
    const cleaned: ProductProfileUpdate = {}
    const stringFields = ['productName', 'category', 'industry'] as const
    for (const field of stringFields) {
      const value = data[field]
      if (typeof value === 'string' && value.trim()) cleaned[field] = value.trim()
    }
    const arrayFields = [
      'applications',
      'keywords',
      'relatedProducts',
      'buyerKeywords',
      'channelKeywords',
      'targetCountries',
      'targetLanguages',
      'recommendedPlatforms',
      'buyingSignals',
      'painPoints',
      'valueAngles',
    ] as const
    for (const field of arrayFields) {
      const value = data[field]
      if (Array.isArray(value)) {
        cleaned[field] = value.filter(
          (item): item is string =>
            typeof item === 'string' && Boolean(item.trim()),
        )
      }
    }
    if (data.buyerPersona !== undefined) {
      cleaned.buyerPersona = toSafeJson(data.buyerPersona)
    }
    if (data.decisionMakerRoles !== undefined) {
      cleaned.decisionMakerRoles = toSafeJson(data.decisionMakerRoles)
    }
    return cleaned
  }

  private hasProductName(value: unknown): value is { productName: string } {
    return (
      Boolean(value) &&
      typeof value === 'object' &&
      typeof (value as { productName?: unknown }).productName === 'string'
    )
  }

  private asProfile(value: unknown): ProductProfileData {
    return value as ProductProfileData
  }
}

export const productIntelligence = new ProductIntelligenceService()
