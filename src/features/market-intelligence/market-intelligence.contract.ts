import type {
  CustomerType,
  MarketSignalType,
  Region,
} from '@/types'
import type { AgentWorkspaceStatus } from '@/components/ui/WorkspaceState'

export type SignalFocus = 'ALL' | MarketSignalType

export type CommercialGoal =
  | 'FIND_BUYERS'
  | 'FIND_SUPPLIERS'
  | 'FIND_PARTNERS'
  | 'FIND_DISTRIBUTORS'
  | 'RESEARCH_COMPETITORS'
  | 'EXPLORE_MARKET'

export interface MarketScanTarget {
  product: string
  industry: string
  region: Region | ''
  customerType: CustomerType | ''
  goal: CommercialGoal
  signalFocus: SignalFocus
}

/**
 * Frontend workspace state. It mirrors only the request lifecycle the UI can
 * prove today. A future backend Agent status endpoint can replace it without
 * changing the workspace components.
 */
export interface MarketAgentWorkspaceState {
  status: AgentWorkspaceStatus
  message: string
  startedAt: string | null
  completedAt: string | null
  errorCode: string | null
}
