import type {
  SalesAgentRunInput,
  SalesAgentRunResult,
} from '../../services/openai-sales-agent.service.js'

export interface AgentRuntime {
  readonly name: 'openai' | 'livekit'
  run(input: SalesAgentRunInput): Promise<SalesAgentRunResult>
}
