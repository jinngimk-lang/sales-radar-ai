export type BuyerRole =
  | 'owner'
  | 'procurement'
  | 'engineering'
  | 'contact'
  | 'content_user'

export type BuyingStage =
  | 'explicit_purchase'
  | 'potential_need'
  | 'observation'

export type SalesAngle =
  | 'reduce_cost'
  | 'improve_efficiency'
  | 'technical_upgrade'
  | 'case_reference'
  | 'reduce_risk'

export interface OutreachContext {
  outreachType?: 'buyer' | 'channel'
  channelProfile?: {
    channelType: string
    channelScore: number
    recommendationReason: string
    cooperationStrategy: string
  }
  contactName: string
  company: string
  industry: string
  role: BuyerRole
  jobTitle: string
  location: string
  stage: BuyingStage
  angle: SalesAngle
  priority: 'A' | 'B' | 'C'
  evidence: string[]
  buyingSignals: Array<{
    signal: string
    evidence: string
    confidence: number
  }>
  painPoint: string
  valueProposition: string
  communicationStyle?: {
    language: 'zh' | 'en' | 'mixed' | 'unknown'
    tone: 'concise' | 'detailed' | 'technical' | 'conversational'
    preferredPlatform: string
    observedTopics: string[]
    evidenceExcerpt: string
  }
  preferences?: {
    objective?: string
    language?: 'auto' | 'zh' | 'en'
    tone?: 'mirror' | 'formal' | 'concise' | 'consultative'
  }
  sourceContext?: {
    sourceUrl: string
    profileUrl: string
  }
}

export interface OutreachContent {
  email: {
    subjectOptions: [string, string, string] | []
    opening: string
    body: string
    cta: string
  }
  linkedin: {
    connectionMessage: string
    firstMessage: string
  }
  whatsapp: {
    message: string
  }
  callScript: {
    opening: string
    questions: string[]
  }
  observationAdvice?: string
}

export interface AIProvider {
  readonly name: string
  generateOutreach(context: OutreachContext): Promise<OutreachContent>
}
