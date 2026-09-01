import {
  assertSalesProviderActionAllowed,
  type SalesProviderActionDescriptor,
  type SalesProviderActionRequest,
  type SalesProviderActionResult,
} from '../contracts/sales-provider-action.contract.js'
import type { SalesSystemProvider } from '../providers/sales-system/sales-system-provider.interface.js'

export interface SalesProviderExecutionPlan {
  providerId: string
  descriptor: SalesProviderActionDescriptor
}

interface ResolvedSalesProviderExecutionPlan extends SalesProviderExecutionPlan {
  provider: SalesSystemProvider
}

export class SalesProviderOrchestrationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'SALES_PROVIDER_NOT_FOUND'
      | 'SALES_PROVIDER_ACTION_UNSUPPORTED'
      | 'SALES_PROVIDER_DUPLICATE_ID'
      | 'SALES_PROVIDER_INVALID_RESULT',
  ) {
    super(message)
    this.name = 'SalesProviderOrchestrationError'
  }
}

export class SalesProviderOrchestrator {
  private readonly providers: readonly SalesSystemProvider[]

  constructor(providers: readonly SalesSystemProvider[]) {
    const seen = new Set<string>()
    for (const provider of providers) {
      if (!provider.id.trim() || seen.has(provider.id)) {
        throw new SalesProviderOrchestrationError(
          `Sales provider id must be unique and non-empty: ${provider.id}`,
          'SALES_PROVIDER_DUPLICATE_ID',
        )
      }
      seen.add(provider.id)
    }
    this.providers = [...providers]
  }

  plan(action: string, providerId?: string): SalesProviderExecutionPlan {
    const resolved = this.resolve(action, providerId)
    return {
      providerId: resolved.providerId,
      descriptor: resolved.descriptor,
    }
  }

  async execute<TPayload = unknown, TData = unknown>(
    request: SalesProviderActionRequest<TPayload>,
  ): Promise<SalesProviderActionResult<TData>> {
    const resolved = this.resolve(request.action, request.provider)
    const authoritativeRequest: SalesProviderActionRequest<TPayload> = {
      ...request,
      provider: resolved.providerId,
      risk: resolved.descriptor.risk,
    }

    assertSalesProviderActionAllowed(authoritativeRequest, resolved.descriptor)

    // Deliberately execute exactly one selected provider. Once an external write,
    // credit-consuming request or send begins, silent failover could duplicate it.
    const result = await resolved.provider.execute<TPayload, TData>(authoritativeRequest)

    if (
      result.provider !== resolved.providerId ||
      result.action !== request.action
    ) {
      throw new SalesProviderOrchestrationError(
        `Sales provider returned an unattributable result for ${request.action}`,
        'SALES_PROVIDER_INVALID_RESULT',
      )
    }

    return result
  }

  private resolve(
    action: string,
    providerId?: string,
  ): ResolvedSalesProviderExecutionPlan {
    if (providerId) {
      const provider = this.providers.find((candidate) => candidate.id === providerId)
      if (!provider) {
        throw new SalesProviderOrchestrationError(
          `Sales provider not found: ${providerId}`,
          'SALES_PROVIDER_NOT_FOUND',
        )
      }

      const descriptor = provider
        .listActions()
        .find((candidate) => candidate.action === action)
      if (!descriptor) {
        throw new SalesProviderOrchestrationError(
          `Sales provider ${providerId} does not support action ${action}`,
          'SALES_PROVIDER_ACTION_UNSUPPORTED',
        )
      }

      return { providerId: provider.id, provider, descriptor }
    }

    for (const provider of this.providers) {
      const descriptor = provider
        .listActions()
        .find((candidate) => candidate.action === action)
      if (descriptor) {
        return { providerId: provider.id, provider, descriptor }
      }
    }

    throw new SalesProviderOrchestrationError(
      `No sales provider supports action ${action}`,
      'SALES_PROVIDER_ACTION_UNSUPPORTED',
    )
  }
}
