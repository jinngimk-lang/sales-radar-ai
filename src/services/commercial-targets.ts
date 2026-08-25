import type { CustomerType, Region } from '@/types'
import type {
  CommercialGoal,
  MarketScanTarget,
  SignalFocus,
} from '@/features/market-intelligence/market-intelligence.contract'

export type CommercialTargetStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED'

export interface CommercialTarget {
  id: string
  userId: string
  name: string
  product: string
  industry: string | null
  region: Region | null
  customerType: CustomerType | null
  goal: CommercialGoal
  signalFocus: SignalFocus
  status: CommercialTargetStatus
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CommercialTargetInput {
  name: string
  product: string
  industry?: string | null
  region?: Region | null
  customerType?: CustomerType | null
  goal: CommercialGoal
  signalFocus?: SignalFocus
  status?: CommercialTargetStatus
  lastRunAt?: string | null
}

export type CommercialTargetUpdate = Partial<CommercialTargetInput>

interface ApiEnvelope<T> {
  data: T
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export async function listCommercialTargets(): Promise<CommercialTarget[]> {
  const response = await request<ApiEnvelope<CommercialTarget[]>>('/commercial-targets')
  return response.data
}

export async function getCommercialTarget(id: string): Promise<CommercialTarget> {
  const response = await request<ApiEnvelope<CommercialTarget>>(
    `/commercial-targets/${encodeURIComponent(id)}`,
  )
  return response.data
}

export async function createCommercialTarget(
  input: CommercialTargetInput,
): Promise<CommercialTarget> {
  const response = await request<ApiEnvelope<CommercialTarget>>('/commercial-targets', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      signalFocus: input.signalFocus ?? 'ALL',
      status: input.status ?? 'ACTIVE',
    }),
  })
  return response.data
}

export async function updateCommercialTarget(
  id: string,
  input: CommercialTargetUpdate,
): Promise<CommercialTarget> {
  const response = await request<ApiEnvelope<CommercialTarget>>(
    `/commercial-targets/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  )
  return response.data
}

export function commercialTargetToMarketTarget(
  target: CommercialTarget,
): MarketScanTarget {
  return {
    product: target.product,
    industry: target.industry ?? '',
    region: target.region ?? '',
    customerType: target.customerType ?? '',
    goal: target.goal,
    signalFocus: target.signalFocus,
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string }
    }
    throw new Error(
      body.error?.message || `目标服务暂时不可用（${response.status}）`,
    )
  }

  return response.json() as Promise<T>
}

function normalizeApiBaseUrl(value: string | undefined) {
  const configuredBaseUrl = value?.trim() || '/api'
  return configuredBaseUrl === '/'
    ? ''
    : configuredBaseUrl.replace(/\/+$/, '')
}
