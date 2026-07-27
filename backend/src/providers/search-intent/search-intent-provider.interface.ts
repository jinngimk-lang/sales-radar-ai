export type SearchTargetType = 'buyer' | 'channel' | 'both'

export interface SearchIntent {
  targetType: SearchTargetType
  industry: string
  product: string
  region: string
  country: string
  relationship: string
  language: string
}

export interface SearchIntentProvider {
  readonly name: string
  parse(input: string): Promise<SearchIntent>
}
