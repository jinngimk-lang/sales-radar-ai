export type RevenueLedgerStatus =
  | 'POTENTIAL'
  | 'CONFIRMED'
  | 'PENDING_PAYOUT'
  | 'PAID'

export interface RevenueValueInput {
  payoutMinMinor: number
  payoutMaxMinor: number
  successProbabilityPct: number
  estimatedHours: number
  capitalRequiredMinor: number
  riskScore: number
  laborCostPerHourMinor?: number
}

export interface RevenueLedgerAmount {
  amountMinor: number
  currency: string
  status: RevenueLedgerStatus
}

export interface RevenueLedgerSummary {
  currency: string
  potentialMinor: number
  confirmedMinor: number
  pendingPayoutMinor: number
  paidMinor: number
  realizedMinor: number
}

const DEFAULT_LABOR_COST_PER_HOUR_MINOR = 2_000
const RISK_PENALTY_RATE = 0.25

export function calculateRiskAdjustedValue(input: RevenueValueInput): number {
  const payoutMin = nonNegative(input.payoutMinMinor)
  const payoutMax = Math.max(payoutMin, nonNegative(input.payoutMaxMinor))
  const midpoint = (payoutMin + payoutMax) / 2
  const probability = clamp(input.successProbabilityPct, 0, 100) / 100
  const hours = nonNegative(input.estimatedHours)
  const capital = nonNegative(input.capitalRequiredMinor)
  const risk = clamp(input.riskScore, 0, 100) / 100
  const laborCost =
    hours * nonNegative(input.laborCostPerHourMinor ?? DEFAULT_LABOR_COST_PER_HOUR_MINOR)
  const riskPenalty = midpoint * risk * RISK_PENALTY_RATE

  return Math.round(midpoint * probability - laborCost - capital - riskPenalty)
}

export function summarizeRevenueLedger(
  entries: RevenueLedgerAmount[],
  currency: string,
): RevenueLedgerSummary {
  const normalizedCurrency = currency.trim().toUpperCase() || 'USD'
  const summary: RevenueLedgerSummary = {
    currency: normalizedCurrency,
    potentialMinor: 0,
    confirmedMinor: 0,
    pendingPayoutMinor: 0,
    paidMinor: 0,
    realizedMinor: 0,
  }

  for (const entry of entries) {
    if (entry.currency.trim().toUpperCase() !== normalizedCurrency) continue
    const amount = nonNegative(entry.amountMinor)
    switch (entry.status) {
      case 'POTENTIAL':
        summary.potentialMinor += amount
        break
      case 'CONFIRMED':
        summary.confirmedMinor += amount
        summary.realizedMinor += amount
        break
      case 'PENDING_PAYOUT':
        summary.pendingPayoutMinor += amount
        summary.realizedMinor += amount
        break
      case 'PAID':
        summary.paidMinor += amount
        summary.realizedMinor += amount
        break
    }
  }

  return summary
}

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
