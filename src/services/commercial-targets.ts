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
}

export type CommercialTargetUpdate = Partial<CommercialTargetInput>

const STORAGE_KEY = 'sales-radar:commercial-targets:v1'
const LOCAL_USER_ID = 'local-workspace-user'

const GOALS = new Set<CommercialGoal>([
  'FIND_BUYERS',
  'FIND_SUPPLIERS',
  'FIND_PARTNERS',
  'FIND_DISTRIBUTORS',
  'RESEARCH_COMPETITORS',
  'EXPLORE_MARKET',
])
const SIGNAL_FOCUSES = new Set<SignalFocus>([
  'ALL',
  'FACTORY_EXPANSION',
  'INVESTMENT',
  'DIGITAL_TRANSFORMATION',
  'HIRING_SIGNAL',
  'POLICY_CHANGE',
  'INDUSTRY_TREND',
])
const STATUSES = new Set<CommercialTargetStatus>([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'CLOSED',
])
const REGIONS = new Set<Region>([
  'USA',
  'Europe',
  'SoutheastAsia',
  'China',
  'MiddleEast',
])
const CUSTOMER_TYPES = new Set<CustomerType>([
  'Buyer',
  'Agent',
  'Company',
  'Individual',
])

export async function listCommercialTargets(): Promise<CommercialTarget[]> {
  return readTargets().sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  )
}

export async function getCommercialTarget(id: string): Promise<CommercialTarget> {
  const target = readTargets().find((item) => item.id === id)
  if (!target) throw new Error('目标不存在或已被删除')
  return target
}

export async function createCommercialTarget(
  input: CommercialTargetInput,
): Promise<CommercialTarget> {
  const name = input.name.trim()
  const product = input.product.trim()
  if (name.length < 2 || product.length < 2) {
    throw new Error('目标名称和产品 / 服务至少需要 2 个字符')
  }

  const now = new Date().toISOString()
  const target: CommercialTarget = {
    id: createLocalId(),
    userId: LOCAL_USER_ID,
    name,
    product,
    industry: normalizeOptionalString(input.industry),
    region: input.region ?? null,
    customerType: input.customerType ?? null,
    goal: input.goal,
    signalFocus: input.signalFocus ?? 'ALL',
    status: input.status ?? 'ACTIVE',
    lastRunAt: null,
    createdAt: now,
    updatedAt: now,
  }

  const targets = readTargets()
  writeTargets([target, ...targets])
  return target
}

export async function updateCommercialTarget(
  id: string,
  input: CommercialTargetUpdate,
): Promise<CommercialTarget> {
  const targets = readTargets()
  const index = targets.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('目标不存在或已被删除')

  const current = targets[index]
  const next: CommercialTarget = {
    ...current,
    name:
      input.name === undefined ? current.name : requireText(input.name, '目标名称'),
    product:
      input.product === undefined
        ? current.product
        : requireText(input.product, '产品 / 服务'),
    industry:
      input.industry === undefined
        ? current.industry
        : normalizeOptionalString(input.industry),
    region: input.region === undefined ? current.region : input.region,
    customerType:
      input.customerType === undefined
        ? current.customerType
        : input.customerType,
    goal: input.goal ?? current.goal,
    signalFocus: input.signalFocus ?? current.signalFocus,
    status: input.status ?? current.status,
    updatedAt: new Date().toISOString(),
  }

  targets[index] = next
  writeTargets(targets)
  return next
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

function readTargets(): CommercialTarget[] {
  const storage = browserStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCommercialTarget)
  } catch (error) {
    console.warn('[CommercialTargets] Unable to read local targets', error)
    return []
  }
}

function writeTargets(targets: CommercialTarget[]) {
  const storage = browserStorage()
  if (!storage) {
    throw new Error('当前浏览器环境无法保存目标')
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(targets))
  } catch (error) {
    console.error('[CommercialTargets] Unable to persist local targets', error)
    throw new Error('浏览器本地存储不可用，目标未保存')
  }
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function createLocalId() {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
  if (randomUUID) return `target_${randomUUID()}`
  return `target_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function requireText(value: string, field: string) {
  const normalized = value.trim()
  if (normalized.length < 2) throw new Error(`${field}至少需要 2 个字符`)
  return normalized
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function isCommercialTarget(value: unknown): value is CommercialTarget {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'string' &&
    Boolean(item.id) &&
    typeof item.userId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.product === 'string' &&
    isNullableString(item.industry) &&
    (item.region === null ||
      (typeof item.region === 'string' && REGIONS.has(item.region as Region))) &&
    (item.customerType === null ||
      (typeof item.customerType === 'string' &&
        CUSTOMER_TYPES.has(item.customerType as CustomerType))) &&
    typeof item.goal === 'string' &&
    GOALS.has(item.goal as CommercialGoal) &&
    typeof item.signalFocus === 'string' &&
    SIGNAL_FOCUSES.has(item.signalFocus as SignalFocus) &&
    typeof item.status === 'string' &&
    STATUSES.has(item.status as CommercialTargetStatus) &&
    (item.lastRunAt === null || typeof item.lastRunAt === 'string') &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string'
  )
}

function isNullableString(value: unknown) {
  return value === null || typeof value === 'string'
}
