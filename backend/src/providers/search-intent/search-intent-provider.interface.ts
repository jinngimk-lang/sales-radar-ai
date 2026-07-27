export type SearchTargetType = 'buyer' | 'channel' | 'both'

export interface SearchIntent {
  targetType: SearchTargetType
  customerType: string
  industry: string
  product: string
  region: string
  country: string
  relationship: string
  language: string
  businessProblem: string
  buyingSignals: string[]
}

export interface SearchIntentProvider {
  readonly name: string
  parse(input: string): Promise<SearchIntent>
}
