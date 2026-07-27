export interface ProductUnderstanding {
  productName: string
  category: string
  industry: string
  applications: string[]
  keywords: string[]
  relatedProducts: string[]
}

export interface BuyerPersona {
  customerType: string
  industry: string
  companyType: string
  reason: string
  painPoints: string[]
}

export interface RecommendedRole {
  role: string
  department: string
  reason: string
}

export interface ProductSearchStrategy {
  buyerKeywords: string[]
  channelKeywords: string[]
  countries: string[]
  languages: string[]
  recommendedPlatforms: string[]
}

export interface SalesPreparation {
  buyingSignals: string[]
  customerPainPoints: string[]
  recommendedValueAngle: string
}

export interface ProductUnderstandingResult {
  productUnderstanding: ProductUnderstanding
  buyerPersona: BuyerPersona[]
  recommendedRoles: RecommendedRole[]
  searchStrategy: ProductSearchStrategy
  salesPreparation: SalesPreparation
}

export interface ProductUnderstandingProvider {
  readonly name: string
  understand(query: string): Promise<ProductUnderstandingResult>
}
