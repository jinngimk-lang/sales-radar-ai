const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

interface ApiEnvelope<T> {
  data: T
  meta?: { total: number }
}

interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
  }
}

export type CommunicationEventType =
  | 'SENT'
  | 'DELIVERED'
  | 'REPLIED'
  | 'MEETING'
  | 'FAILED'

export type CommunicationVerificationSource =
  | 'PROVIDER_VERIFIED'
  | 'USER_EVIDENCE_VERIFIED'

export type CommunicationChannel =
  | 'email'
  | 'linkedin'
  | 'whatsapp'
  | 'call'
  | 'other'

export type CommunicationState =
  | 'RESEARCH'
  | 'READY'
  | 'SENT'
  | 'REPLIED'
  | 'MEETING'

export interface CommunicationEvent {
  id: string
  userId: string
  leadId: string
  outreachMessageId: string | null
  channel: string
  eventType: CommunicationEventType
  verificationSource: CommunicationVerificationSource
  provider: string | null
  externalEventId: string | null
  evidenceUrl: string | null
  evidenceNote: string | null
  occurredAt: string
  createdAt: string
}

export interface CommunicationSummary {
  state: CommunicationState
  lastEvent: CommunicationEvent | null
  eventCount: number
}

export interface RecordCommunicationEvidenceInput {
  eventType: Exclude<CommunicationEventType, 'DELIVERED'>
  channel: CommunicationChannel
  externalEventId?: string
  evidenceUrl?: string
  evidenceNote?: string
  occurredAt?: string
}

export class CommunicationEvidenceApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'CommunicationEvidenceApiError'
  }
}

export async function getCommunicationEvents(
  leadId: string,
): Promise<CommunicationEvent[]> {
  const response = await request<ApiEnvelope<CommunicationEvent[]>>(
    `/leads/${encodeURIComponent(leadId)}/communication-events`,
  )
  return response.data
}

export async function getCommunicationSummary(
  leadId: string,
): Promise<CommunicationSummary> {
  const response = await request<ApiEnvelope<CommunicationSummary>>(
    `/leads/${encodeURIComponent(leadId)}/communication-summary`,
  )
  return response.data
}

export async function recordCommunicationEvidence(
  leadId: string,
  input: RecordCommunicationEvidenceInput,
): Promise<CommunicationEvent> {
  const response = await request<ApiEnvelope<CommunicationEvent>>(
    `/leads/${encodeURIComponent(leadId)}/communication-events`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
  return response.data
}

function normalizeApiBaseUrl(value: string | undefined): string {
  const configuredBaseUrl = value?.trim() || '/api'
  if (configuredBaseUrl === '/') return ''
  return configuredBaseUrl.replace(/\/+$/, '')
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
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    throw new CommunicationEvidenceApiError(
      body.error?.message || `沟通事实请求失败（${response.status}）`,
      response.status,
      body.error?.code,
    )
  }

  return response.json() as Promise<T>
}
