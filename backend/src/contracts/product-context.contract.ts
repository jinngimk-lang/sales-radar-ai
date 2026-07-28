export interface SearchProductContext {
  product?: string
  category?: string
  customerType?: string
  industry?: string
  region?: string
  country?: string
  businessProblem?: string
  applications?: string[]
  buyingSignals?: string[]
  buyerKeywords?: string[]
  channelKeywords?: string[]
}

export const PRODUCT_CONTEXT_SNAPSHOT_VERSION = 'v2' as const

export type ProductContextSource =
  | 'inferred'
  | 'request'
  | 'product_profile'
  | 'combined'

export interface ProductContextSnapshot {
  version: typeof PRODUCT_CONTEXT_SNAPSHOT_VERSION
  capturedAt: string
  source: ProductContextSource
  productProfile: {
    id: string
    productName: string
    updatedAt: string
  } | null
  context: SearchProductContext
}
