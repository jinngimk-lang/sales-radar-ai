import type {
  OpportunityCustomerGoal,
} from '../contracts/opportunity.contract.js'
import type { SearchProductContext } from '../contracts/product-context.contract.js'

export type ProductFamily = 'PACKAGING_AUTOMATION' | 'UNKNOWN'

export type TargetIndustry =
  | 'FOOD_MANUFACTURING'
  | 'BEVERAGE'
  | 'PHARMACEUTICAL'
  | 'CONSUMER_GOODS'
  | 'INDUSTRIAL_MANUFACTURING'

export interface NormalizedOpportunityProductContext {
  customerGoal: OpportunityCustomerGoal
  productFamily: ProductFamily
  productFamilyTerms: string[]
  targetIndustries: TargetIndustry[]
  targetIndustryTerms: string[]
  applicableIndustries: TargetIndustry[]
  contextTerms: string[]
  original: SearchProductContext
}

const PACKAGING_PRODUCT_PATTERN =
  /\b(?:packaging|packing)\s+(?:automation|machiner(?:y|ies)|equipment|lines?|systems?|machines?)\b/i

const PRODUCT_FAMILY_TERMS: Record<ProductFamily, string[]> = {
  PACKAGING_AUTOMATION: [
    'packaging automation',
    'packaging machinery',
    'packaging equipment',
    'packaging line',
    'packaging system',
    'packing machine',
  ],
  UNKNOWN: [],
}

const PACKAGING_APPLICABLE_INDUSTRIES: TargetIndustry[] = [
  'FOOD_MANUFACTURING',
  'BEVERAGE',
  'PHARMACEUTICAL',
  'CONSUMER_GOODS',
  'INDUSTRIAL_MANUFACTURING',
]

const TARGET_INDUSTRY_ALIASES: Record<TargetIndustry, RegExp[]> = {
  FOOD_MANUFACTURING: [
    /\bfood\s+(?:manufacturing|manufacturer|processing|production)\b/i,
    /\bfood\s+industry\b/i,
  ],
  BEVERAGE: [
    /\bbeverage(?:s|\s+manufacturing|\s+production|\s+industry)?\b/i,
    /\bbottling\b/i,
  ],
  PHARMACEUTICAL: [
    /\bpharmaceutical(?:s|\s+manufacturing|\s+industry)?\b/i,
    /\bpharma\b/i,
  ],
  CONSUMER_GOODS: [
    /\bconsumer\s+(?:goods|products|packaged goods)\b/i,
    /\bcpg\b/i,
  ],
  INDUSTRIAL_MANUFACTURING: [
    /\bindustrial\s+manufacturing\b/i,
    /\bmanufacturing\s+industry\b/i,
  ],
}

const TARGET_INDUSTRY_TERMS: Record<TargetIndustry, string[]> = {
  FOOD_MANUFACTURING: ['food manufacturing', 'food processing', 'food production'],
  BEVERAGE: ['beverage', 'bottling'],
  PHARMACEUTICAL: ['pharmaceutical', 'pharma'],
  CONSUMER_GOODS: ['consumer goods', 'consumer packaged goods', 'cpg'],
  INDUSTRIAL_MANUFACTURING: ['industrial manufacturing', 'manufacturing'],
}

const CONTEXT_STOP_WORDS = new Set([
  'and',
  'business',
  'companies',
  'company',
  'customer',
  'customers',
  'find',
  'for',
  'from',
  'into',
  'sell',
  'the',
  'with',
])

export class ProductContextNormalizationService {
  normalize(
    context: SearchProductContext,
  ): NormalizedOpportunityProductContext {
    const customerGoal = this.normalizeCustomerGoal(context.customerType)
    const familyInput = [
      context.product,
      context.category,
      context.industry,
      ...(context.applications ?? []),
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ')
    const productFamily = PACKAGING_PRODUCT_PATTERN.test(familyInput)
      ? 'PACKAGING_AUTOMATION'
      : 'UNKNOWN'

    const targetIndustries = this.targetIndustries(context.industry)
    const applicableIndustries =
      productFamily === 'PACKAGING_AUTOMATION'
        ? PACKAGING_APPLICABLE_INDUSTRIES
        : []
    const targetIndustryTerms = targetIndustries.flatMap(
      (industry) => TARGET_INDUSTRY_TERMS[industry],
    )
    const contextTerms = [
      context.product,
      context.businessProblem,
      ...(context.applications ?? []),
      ...(context.buyingSignals ?? []),
    ]
      .filter((value): value is string => Boolean(value))
      .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/))
      .filter(
        (value) =>
          value.length >= 4 && !CONTEXT_STOP_WORDS.has(value),
      )

    return {
      customerGoal,
      productFamily,
      productFamilyTerms: PRODUCT_FAMILY_TERMS[productFamily],
      targetIndustries,
      targetIndustryTerms,
      applicableIndustries,
      contextTerms: [...new Set(contextTerms)],
      original: context,
    }
  }

  normalizeCustomerGoal(value: string | undefined): OpportunityCustomerGoal {
    if (!value) return 'UNKNOWN'
    const normalized = value
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (
      /^(?:buyer|buyers|buyer companies|buyer company|company buyers|end user companies|end user company|end users?|customer companies|target customers?)$/.test(
        normalized,
      )
    ) {
      return 'BUYER'
    }
    if (
      /^(?:supplier|suppliers|vendor|vendors|supplier companies|sourcing suppliers?)$/.test(
        normalized,
      )
    ) {
      return 'SUPPLIER'
    }
    if (
      /^(?:distributor|distributors|dealer|dealers|reseller|resellers|channel|channels|agent|agents)$/.test(
        normalized,
      )
    ) {
      return 'DISTRIBUTOR'
    }
    if (
      /^(?:partner|partners|partnership|cooperation|business partners?|channel partners?)$/.test(
        normalized,
      )
    ) {
      return 'PARTNER'
    }
    if (/^(?:competitor|competitors|competition)$/.test(normalized)) {
      return 'COMPETITOR'
    }
    return 'UNKNOWN'
  }

  private targetIndustries(value: string | undefined): TargetIndustry[] {
    if (!value || PACKAGING_PRODUCT_PATTERN.test(value)) return []

    return (
      Object.entries(TARGET_INDUSTRY_ALIASES) as [
        TargetIndustry,
        RegExp[],
      ][]
    )
      .filter(([, aliases]) => aliases.some((alias) => alias.test(value)))
      .map(([industry]) => industry)
  }
}

export const productContextNormalization =
  new ProductContextNormalizationService()
