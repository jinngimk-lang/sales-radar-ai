import type { ChatSession, Customer } from '@/types'

export function customersToCommandSessions(
  customers: Customer[],
): ChatSession[] {
  return customers.map((customer) => ({
    id: customer.id,
    customerName: customer.company ?? customer.displayName,
    displayName: customer.displayName,
    company: customer.company ?? null,
    avatarUrl: customer.avatarUrl ?? null,
    initials: customer.initials,
    platform: customer.platform,
    jobTitle: customer.jobTitle ?? null,
    sourceUrl: customer.sourceUrl,
    profileUrl: customer.profileUrl,
    postContent: customer.postContent,
    contacts: customer.contacts ?? [],
    audienceType:
      customer.audienceType ??
      (customer.customerType === 'Individual'
        ? 'person'
        : customer.customerType === 'Agent'
          ? 'intermediary'
          : 'company'),
    contactReadiness:
      (customer.contacts ?? []).length > 0 ? 'ready' : 'research',
    assistantScores: {
      overall: customer.signalScores?.overall ?? customer.analysis.intentScore,
      intent: customer.signalScores?.intent ?? customer.analysis.intentScore,
      identity: customer.signalScores?.identity ?? 55,
      evidence: customer.signalScores?.evidence ?? 55,
      contact: Math.min(100, (customer.contacts ?? []).length * 25),
    },
    communicationProfile: {
      language: 'unknown',
      tone: 'conversational',
      preferredPlatform: customer.platform,
      observedTopics: customer.analysis.tags,
      evidenceExcerpt: customer.postContent.slice(0, 360),
    },
    lastMessage: customer.postContent,
    lastMessageAt: customer.postedAt,
    updatedAt: customer.postedAt,
    unreadCount: 0,
    intentScore: customer.analysis.intentScore,
    tags: customer.analysis.tags,
  }))
}
