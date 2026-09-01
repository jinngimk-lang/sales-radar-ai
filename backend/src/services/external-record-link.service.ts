import type {
  ExternalRecordLookup,
  ExternalSalesRecord,
} from '../providers/sales-system/sales-system-provider.interface.js'

export type ExternalRecordMatchConfidence = 'exact' | 'strong' | 'none'

export type ExternalRecordMatchReason =
  | 'provider_external_id'
  | 'verified_email'
  | 'profile_url'
  | 'company_domain'
  | 'person_name_and_company_domain'
  | 'no_match'

export interface ExternalRecordMatch {
  matched: boolean
  confidence: ExternalRecordMatchConfidence
  reason: ExternalRecordMatchReason
}

const NO_MATCH: ExternalRecordMatch = {
  matched: false,
  confidence: 'none',
  reason: 'no_match',
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase()
  return normalized || null
}

function normalizeName(value: string | null | undefined): string | null {
  const normalized = value
    ?.normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, ' ')
  return normalized || null
}

function normalizeDomain(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase()
  if (!trimmed) return null

  try {
    const candidate = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const hostname = new URL(candidate).hostname
      .toLowerCase()
      .replace(/^www\./, '')
      .replace(/\.$/, '')
    return hostname || null
  } catch {
    return null
  }
}

function normalizeProfileUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  try {
    const candidate = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const url = new URL(candidate)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    const pathname = url.pathname.replace(/\/+$/, '') || '/'
    return `${hostname}${pathname}`
  } catch {
    return null
  }
}

export function matchExternalRecord(
  record: ExternalSalesRecord,
  lookup: ExternalRecordLookup,
): ExternalRecordMatch {
  if (record.kind !== lookup.kind) return NO_MATCH

  if (
    lookup.provider &&
    lookup.externalId &&
    record.provider === lookup.provider &&
    record.externalId === lookup.externalId
  ) {
    return {
      matched: true,
      confidence: 'exact',
      reason: 'provider_external_id',
    }
  }

  const recordEmail = normalizeEmail(record.email)
  const lookupEmail = normalizeEmail(lookup.email)
  if (
    record.emailVerified === true &&
    recordEmail &&
    lookupEmail &&
    recordEmail === lookupEmail
  ) {
    return {
      matched: true,
      confidence: 'exact',
      reason: 'verified_email',
    }
  }

  const recordProfileUrl = normalizeProfileUrl(record.profileUrl)
  const lookupProfileUrl = normalizeProfileUrl(lookup.profileUrl)
  if (
    recordProfileUrl &&
    lookupProfileUrl &&
    recordProfileUrl === lookupProfileUrl
  ) {
    return {
      matched: true,
      confidence: 'exact',
      reason: 'profile_url',
    }
  }

  const recordDomain = normalizeDomain(record.companyDomain)
  const lookupDomain = normalizeDomain(lookup.companyDomain)

  if (
    record.kind === 'organization' &&
    recordDomain &&
    lookupDomain &&
    recordDomain === lookupDomain
  ) {
    return {
      matched: true,
      confidence: 'strong',
      reason: 'company_domain',
    }
  }

  if (record.kind === 'person' && recordDomain && lookupDomain) {
    const recordName = normalizeName(record.fullName)
    const lookupName = normalizeName(lookup.fullName)
    if (
      recordName &&
      lookupName &&
      recordName === lookupName &&
      recordDomain === lookupDomain
    ) {
      return {
        matched: true,
        confidence: 'strong',
        reason: 'person_name_and_company_domain',
      }
    }
  }

  return NO_MATCH
}
