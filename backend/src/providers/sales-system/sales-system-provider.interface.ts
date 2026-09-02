import type {
  SalesProviderActionDescriptor,
  SalesProviderActionRequest,
  SalesProviderActionResult,
} from '../../contracts/sales-provider-action.contract.js'

export type ExternalSalesRecordKind = 'person' | 'organization'

export interface ExternalSalesRecord {
  kind: ExternalSalesRecordKind
  provider: string
  externalId: string
  fullName?: string | null
  companyName?: string | null
  email?: string | null
  emailVerified?: boolean
  companyDomain?: string | null
  profileUrl?: string | null
  metadata?: Record<string, unknown>
}

export interface ExternalRecordLookup {
  kind: ExternalSalesRecordKind
  provider?: string
  externalId?: string
  fullName?: string | null
  companyName?: string | null
  email?: string | null
  companyDomain?: string | null
  profileUrl?: string | null
}

export interface SalesSystemProvider {
  readonly id: string
  listActions(): readonly SalesProviderActionDescriptor[]
  findRecords(lookup: ExternalRecordLookup): Promise<ExternalSalesRecord[]>
  execute<TPayload = unknown, TData = unknown>(
    request: SalesProviderActionRequest<TPayload>,
  ): Promise<SalesProviderActionResult<TData>>
}
