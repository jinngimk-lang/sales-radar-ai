import type { SalesProviderActionStatus } from '../contracts/sales-provider-action.contract.js'

export type CommunicationState =
  | 'DRAFT'
  | 'READY_TO_SEND'
  | 'CHANNEL_OPENED'
  | 'SENT_VERIFIED'
  | 'REPLIED_VERIFIED'
  | 'MEETING_VERIFIED'
  | 'CLOSED'

export interface CommunicationReceiptInput {
  provider: string
  state: CommunicationState
  observedAt: string
  externalReceiptId?: string
  externalThreadId?: string
  externalEventId?: string
  providerStatus?: SalesProviderActionStatus
  metadata?: Record<string, unknown>
}

export interface VerifiedCommunicationReceipt {
  provider: string
  state: CommunicationState
  observedAt: string
  externalReceiptId?: string
  externalThreadId?: string
  externalEventId?: string
  metadata?: Record<string, unknown>
}

const RECEIPT_REQUIRED_STATES = new Set<CommunicationState>([
  'SENT_VERIFIED',
  'REPLIED_VERIFIED',
  'MEETING_VERIFIED',
])

function cleanOptionalId(value: string | undefined): string | undefined {
  const cleaned = value?.trim()
  return cleaned || undefined
}

export function verifyCommunicationReceipt(
  input: CommunicationReceiptInput,
): VerifiedCommunicationReceipt {
  const provider = input.provider.trim()
  if (!provider) {
    throw new Error('Communication receipt requires a provider.')
  }

  const observedTimestamp = new Date(input.observedAt).getTime()
  if (!Number.isFinite(observedTimestamp)) {
    throw new Error('Communication receipt requires a valid observed timestamp.')
  }

  const externalReceiptId = cleanOptionalId(input.externalReceiptId)
  const externalThreadId = cleanOptionalId(input.externalThreadId)
  const externalEventId = cleanOptionalId(input.externalEventId)

  if (
    RECEIPT_REQUIRED_STATES.has(input.state) &&
    !externalReceiptId &&
    !externalThreadId &&
    !externalEventId
  ) {
    throw new Error(
      `Verified communication state ${input.state} requires an external receipt or attributable provider record id.`,
    )
  }

  return {
    provider,
    state: input.state,
    observedAt: input.observedAt,
    ...(externalReceiptId ? { externalReceiptId } : {}),
    ...(externalThreadId ? { externalThreadId } : {}),
    ...(externalEventId ? { externalEventId } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  }
}
