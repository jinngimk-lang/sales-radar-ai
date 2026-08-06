export type RevenueOpportunityCategory =
  | 'OPEN_SOURCE_BOUNTY'
  | 'SECURITY_BOUNTY'
  | 'AI_TASK'
  | 'USER_RESEARCH'
  | 'AFFILIATE'
  | 'QUANT_RESEARCH'
  | 'OTHER'

export type RevenueOpportunityStatus =
  | 'DISCOVERED'
  | 'QUALIFIED'
  | 'ACTIVE'
  | 'WAITING'
  | 'WON'
  | 'LOST'
  | 'REJECTED'

export type RevenueLedgerStatus =
  | 'POTENTIAL'
  | 'CONFIRMED'
  | 'PENDING_PAYOUT'
  | 'PAID'

export interface RevenueOpportunity {
  id: string
  title: string
  platform: string
  category: RevenueOpportunityCategory
  sourceUrl: string
  currency: string
  payoutMinMinor: number
  payoutMaxMinor: number
  successProbabilityPct: number
  estimatedHours: number
  capitalRequiredMinor: number
  riskScore: number
  status: RevenueOpportunityStatus
  evidenceSummary: string | null
  nextAction: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  riskAdjustedValueMinor: number
}

export interface RevenueLedgerEntry {
  id: string
  opportunityId: string | null
  amountMinor: number
  currency: string
  status: RevenueLedgerStatus
  evidenceUrl: string | null
  evidenceNote: string | null
  recognizedAt: string
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RevenueDashboard {
  summary: {
    currency: string
    potentialMinor: number
    confirmedMinor: number
    pendingPayoutMinor: number
    paidMinor: number
    realizedMinor: number
    activeOpportunityCount: number
    totalRiskAdjustedValueMinor: number
  }
  opportunities: RevenueOpportunity[]
  ledger: RevenueLedgerEntry[]
  policy: {
    zeroCapitalDefault: boolean
    leverageAllowed: boolean
    potentialCountsAsConfirmed: boolean
    evidenceRequiredForRecognizedRevenue: boolean
  }
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export async function getRevenueDashboard(
  currency = 'USD',
): Promise<RevenueDashboard> {
  const response = await fetch(
    `${API_BASE_URL}/revenue/dashboard?currency=${encodeURIComponent(currency)}`,
    { headers: { Accept: 'application/json' } },
  )

  if (!response.ok) {
    throw new Error(`收益控制台暂时不可用（${response.status}）`)
  }

  const payload = (await response.json()) as { data: RevenueDashboard }
  return payload.data
}

function normalizeApiBaseUrl(value: string | undefined): string {
  const configuredBaseUrl = value?.trim() || '/api'
  if (configuredBaseUrl === '/') return ''
  return configuredBaseUrl.replace(/\/+$/, '')
}
