export type SalesProviderRisk =
  | 'READ'
  | 'DRAFT'
  | 'WRITE'
  | 'CREDIT'
  | 'SEND'
  | 'DESTRUCTIVE'

export type SalesProviderApproval = 'automatic' | 'required' | 'blocked'

export interface SalesProviderActionDescriptor {
  action: string
  risk: SalesProviderRisk
  approval?: SalesProviderApproval
  consumesCredits?: boolean
  description?: string
}

export interface SalesProviderActionRequest<TPayload = unknown> {
  action: string
  provider?: string
  risk: SalesProviderRisk
  approved?: boolean
  approvalId?: string
  payload: TPayload
}

export type SalesProviderActionStatus =
  | 'completed'
  | 'accepted'
  | 'queued'
  | 'drafted'
  | 'failed'

export interface SalesProviderActionResult<TData = unknown> {
  provider: string
  action: string
  status: SalesProviderActionStatus
  externalId?: string
  externalReceiptId?: string
  observedAt?: string
  data?: TData
}

const APPROVAL_STRICTNESS: Record<SalesProviderApproval, number> = {
  automatic: 0,
  required: 1,
  blocked: 2,
}

export class SalesProviderPolicyError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'SALES_PROVIDER_APPROVAL_REQUIRED'
      | 'SALES_PROVIDER_ACTION_BLOCKED',
  ) {
    super(message)
    this.name = 'SalesProviderPolicyError'
  }
}

export function defaultApprovalForRisk(
  risk: SalesProviderRisk,
): SalesProviderApproval {
  if (risk === 'READ' || risk === 'DRAFT') return 'automatic'
  if (risk === 'DESTRUCTIVE') return 'blocked'
  return 'required'
}

export function resolveActionApproval(
  descriptor: SalesProviderActionDescriptor,
): SalesProviderApproval {
  const defaultApproval = defaultApprovalForRisk(descriptor.risk)
  const requestedApproval = descriptor.approval ?? defaultApproval

  return APPROVAL_STRICTNESS[requestedApproval] >
    APPROVAL_STRICTNESS[defaultApproval]
    ? requestedApproval
    : defaultApproval
}

export function assertSalesProviderActionAllowed(
  request: SalesProviderActionRequest,
  descriptor?: SalesProviderActionDescriptor,
): void {
  const approval = resolveActionApproval(
    descriptor ?? {
      action: request.action,
      risk: request.risk,
    },
  )

  if (approval === 'blocked') {
    throw new SalesProviderPolicyError(
      `Sales provider action blocked: ${request.action}`,
      'SALES_PROVIDER_ACTION_BLOCKED',
    )
  }

  if (approval === 'required' && request.approved !== true) {
    throw new SalesProviderPolicyError(
      `Sales provider approval required: ${request.action}`,
      'SALES_PROVIDER_APPROVAL_REQUIRED',
    )
  }
}
