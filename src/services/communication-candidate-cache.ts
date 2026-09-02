import type { ChatSession, Customer, MarketSignal, Platform } from '@/types'

const STORAGE_KEY = 'sales-radar.communication-candidates.v1'
const MAX_CANDIDATES = 100

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function readCached(): ChatSession[] {
  const target = storage()
  if (!target) return []

  try {
    const parsed = JSON.parse(target.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isChatSessionLike).slice(0, MAX_CANDIDATES)
  } catch {
    return []
  }
}

function writeCached(items: ChatSession[]): void {
  const target = storage()
  if (!target) return

  try {
    target.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_CANDIDATES)))
  } catch {
    // Cache failure must never block search or market research.
  }
}

function mergeIntoCache(incoming: ChatSession[]): void {
  if (incoming.length === 0) return

  const merged = new Map<string, ChatSession>()
  for (const item of incoming) merged.set(item.id, item)
  for (const item of readCached()) {
    if (!merged.has(item.id)) merged.set(item.id, item)
  }
  writeCached(Array.from(merged.values()))
}

export function cacheSearchCommunicationCandidates(customers: Customer[]): void {
  mergeIntoCache(customers.map(customerToSession))
}

export function cacheMarketCommunicationCandidates(signals: MarketSignal[]): void {
  mergeIntoCache(signals.map(signalToSession))
}

export function getCachedCommunicationSessions(): ChatSession[] {
  return readCached()
}

function customerToSession(customer: Customer): ChatSession {
  const contacts = customer.contacts ?? []
  const firstObservedEmail = contacts.find((contact) => contact.email.trim())?.email.trim()
  const companyName = customer.company?.trim() || null
  const displayName = customer.displayName.trim() || companyName || '公开来源对象'

  return {
    id: `search:${customer.id}`,
    customerName: companyName || displayName,
    displayName,
    company: companyName,
    avatarUrl: customer.avatarUrl ?? null,
    initials: customer.initials || initials(displayName),
    platform: customer.platform,
    jobTitle: customer.jobTitle ?? null,
    sourceUrl: customer.sourceUrl,
    profileUrl: customer.profileUrl || customer.sourceUrl,
    postContent: customer.postContent,
    contacts,
    audienceType: customer.audienceType,
    contactReadiness: contacts.length > 0 ? 'ready' : 'research',
    assistantScores: customer.signalScores
      ? { ...customer.signalScores, contact: contacts.length > 0 ? 100 : 0 }
      : undefined,
    communicationProfile: {
      language: 'unknown',
      tone: 'concise',
      preferredPlatform: firstObservedEmail ? 'Email' : customer.platform,
      observedTopics: customer.analysis.needKeywords ?? [],
      evidenceExcerpt: customer.postContent,
      basis: '来自当前搜索保存的公开来源与联系人证据；发送前仍需核对。',
    },
    lastMessage: customer.analysis.suggestion || customer.postContent,
    updatedAt: new Date().toISOString(),
  }
}

function signalToSession(signal: MarketSignal): ChatSession {
  const name = signal.companyName?.trim() || signal.title.trim() || '公开市场信号'
  const excerpt = signal.summary || signal.content || signal.title

  return {
    id: `market:${signal.id}`,
    customerName: name,
    displayName: name,
    company: signal.companyName?.trim() || null,
    initials: initials(name),
    platform: 'Website' as Platform,
    jobTitle: null,
    sourceUrl: signal.sourceUrl,
    profileUrl: signal.sourceUrl,
    postContent: excerpt,
    contacts: [],
    contactReadiness: 'research',
    communicationProfile: {
      language: 'unknown',
      tone: 'concise',
      preferredPlatform: '待补联系人证据',
      observedTopics: [signal.signalType],
      evidenceExcerpt: excerpt,
      basis: '来自市场雷达保存的公开来源；当前尚未发现可归因公开联系人。',
    },
    lastMessage: excerpt,
    updatedAt: signal.updatedAt || signal.detectedAt || new Date().toISOString(),
  }
}

function initials(value: string): string {
  return value.trim().slice(0, 2).toUpperCase() || 'SR'
}

function isChatSessionLike(value: unknown): value is ChatSession {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ChatSession>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.customerName === 'string' &&
    typeof candidate.sourceUrl === 'string' &&
    Array.isArray(candidate.contacts) &&
    Boolean(candidate.communicationProfile)
  )
}
