import type {
  ProductUnderstandingProvider,
  ProductUnderstandingResult,
} from '../providers/product-understanding/product-understanding-provider.interface.js'
import { ruleBasedProductUnderstandingProvider } from '../providers/product-understanding/rule-based-product-understanding.provider.js'
import type { AIProvider } from '../providers/ai-platform/ai-provider.interface.js'
import { aiProviderFactory } from '../providers/ai-platform/ai-provider.factory.js'
import { AITaskType } from '../providers/ai-platform/ai-task-type.js'
import { aiResponseParser, type AIResponseParser } from './ai-response-parser.service.js'
import { aiUsageLogs, type AIUsageLogService } from './ai-usage-log.service.js'
import {
  promptTemplates,
  type PromptTemplateService,
} from './prompt-template.service.js'

export interface ProductUnderstandingResponse
  extends ProductUnderstandingResult {
  provider: string
}

const DEFAULT_PRODUCT_PROMPT =
  'You are a B2B global sales product analysis expert. Return structured JSON with productUnderstanding, buyerPersona, recommendedRoles, searchStrategy, and salesPreparation. Do not invent companies, customers, contacts, or procurement events.'

export class ProductUnderstandingService {
  constructor(
    private readonly provider: AIProvider = aiProviderFactory.resolve(
      AITaskType.PRODUCT_UNDERSTANDING,
    ),
    private readonly fallbackProvider: AIProvider =
      aiProviderFactory.getFallback(),
    private readonly ruleBasedUnderstanding: ProductUnderstandingProvider =
      ruleBasedProductUnderstandingProvider,
    private readonly promptService: PromptTemplateService = promptTemplates,
    private readonly parser: AIResponseParser = aiResponseParser,
    private readonly usageLogs: AIUsageLogService = aiUsageLogs,
  ) {}

  async understand(query: string): Promise<ProductUnderstandingResponse> {
    const fallbackResponse =
      await this.ruleBasedUnderstanding.understand(query)
    const prompt = await this.promptService
      .getByTaskType(AITaskType.PRODUCT_UNDERSTANDING)
      .then((template) => template?.template ?? DEFAULT_PRODUCT_PROMPT)
      .catch(() => DEFAULT_PRODUCT_PROMPT)
    const request = {
      taskType: AITaskType.PRODUCT_UNDERSTANDING,
      prompt,
      context: {
        query,
        expectedOutput:
          'productUnderstanding, buyerPersona, recommendedRoles, searchStrategy, salesPreparation',
        fallbackResponse,
      },
    }

    if (this.provider !== this.fallbackProvider) {
      const startedAt = Date.now()
      try {
        const generated = await this.provider.generate(request)
        const parsed = this.parser.parseWithStatus(
          generated.output,
          isProductUnderstandingResult,
          fallbackResponse,
        )
        await this.usageLogs.safeRecord({
          taskType: AITaskType.PRODUCT_UNDERSTANDING,
          provider: generated.provider,
          model: generated.model,
          success: !parsed.usedFallback,
          latencyMs: Date.now() - startedAt,
        })
        if (!parsed.usedFallback) {
          return {
            ...preserveSpecificUnderstanding(
              parsed.value,
              fallbackResponse,
            ),
            provider: generated.provider,
          }
        }
      } catch {
        await this.usageLogs.safeRecord({
          taskType: AITaskType.PRODUCT_UNDERSTANDING,
          provider: this.provider.name,
          model: this.provider.model,
          success: false,
          latencyMs: Date.now() - startedAt,
        })
      }
    }

    const fallbackStartedAt = Date.now()
    const fallback = await this.fallbackProvider.generate(request)
    const safeFallback = this.parser.parse(
      fallback.output,
      isProductUnderstandingResult,
      fallbackResponse,
    )
    await this.usageLogs.safeRecord({
      taskType: AITaskType.PRODUCT_UNDERSTANDING,
      provider: fallback.provider,
      model: fallback.model,
      success: true,
      latencyMs: Date.now() - fallbackStartedAt,
    })
    return {
      ...preserveSpecificUnderstanding(safeFallback, fallbackResponse),
      provider: fallback.provider,
    }
  }
}

function isProductUnderstandingResult(
  value: unknown,
): value is ProductUnderstandingResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const result = value as Record<string, unknown>
  const product = record(result.productUnderstanding)
  const strategy = record(result.searchStrategy)
  const preparation = record(result.salesPreparation)
  return (
    typeof product.productName === 'string' &&
    typeof product.category === 'string' &&
    typeof product.industry === 'string' &&
    stringArray(product.applications) &&
    stringArray(product.keywords) &&
    stringArray(product.relatedProducts) &&
    Array.isArray(result.buyerPersona) &&
    Array.isArray(result.recommendedRoles) &&
    stringArray(strategy.buyerKeywords) &&
    stringArray(strategy.channelKeywords) &&
    stringArray(strategy.countries) &&
    stringArray(strategy.languages) &&
    stringArray(strategy.recommendedPlatforms) &&
    stringArray(preparation.buyingSignals) &&
    stringArray(preparation.customerPainPoints) &&
    typeof preparation.recommendedValueAngle === 'string'
  )
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function preserveSpecificUnderstanding(
  result: ProductUnderstandingResult,
  ruleBased: ProductUnderstandingResult,
): ProductUnderstandingResult {
  const genericProducts = new Set([
    'software',
    'saas',
    'saas software',
    'business software',
  ])
  const resultName = result.productUnderstanding.productName
    .trim()
    .toLowerCase()
  const ruleBasedName = ruleBased.productUnderstanding.productName
    .trim()
    .toLowerCase()

  if (
    !genericProducts.has(resultName) ||
    genericProducts.has(ruleBasedName)
  ) {
    return result
  }

  return {
    ...result,
    productUnderstanding: {
      ...result.productUnderstanding,
      productName: ruleBased.productUnderstanding.productName,
      category: ruleBased.productUnderstanding.category,
      industry: ruleBased.productUnderstanding.industry,
      applications: ruleBased.productUnderstanding.applications,
      keywords: ruleBased.productUnderstanding.keywords,
    },
    buyerPersona:
      ruleBased.buyerPersona.length > 0
        ? ruleBased.buyerPersona
        : result.buyerPersona,
    searchStrategy: {
      ...result.searchStrategy,
      buyerKeywords: ruleBased.searchStrategy.buyerKeywords,
    },
  }
}

export const productUnderstanding = new ProductUnderstandingService()
