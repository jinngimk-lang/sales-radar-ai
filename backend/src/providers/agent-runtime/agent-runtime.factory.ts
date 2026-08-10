import { openAISalesAgent } from '../../services/openai-sales-agent.service.js'
import type { AgentRuntime } from './agent-runtime.interface.js'
import { LiveKitAgentRuntime } from './livekit-agent.runtime.js'
import { AppError } from '../../utils/app-error.js'

interface AgentRuntimeFactoryOptions {
  openai?: AgentRuntime
  livekit?: AgentRuntime | null
}

export class AgentRuntimeFactory {
  private readonly openai: AgentRuntime
  private readonly livekit: AgentRuntime | null

  constructor(options: AgentRuntimeFactoryOptions = {}) {
    this.openai = options.openai ?? {
      name: 'openai',
      run: (input) => openAISalesAgent.run(input),
    }
    this.livekit = options.livekit === undefined ? liveKitFromEnvironment() : options.livekit
  }

  resolve(environment: NodeJS.ProcessEnv = process.env): AgentRuntime {
    const provider = environment.AGENT_RUNTIME_PROVIDER?.trim().toLowerCase() || 'openai'
    if (provider === 'openai') return this.openai
    if (provider === 'livekit') {
      if (!this.livekit) {
        throw new AppError(
          503,
          'AGENT_RUNTIME_NOT_CONFIGURED',
          'Sales Agent runtime is not configured',
        )
      }
      return this.livekit
    }
    throw new AppError(
      503,
      'AGENT_RUNTIME_NOT_CONFIGURED',
      `Unsupported agent runtime provider: ${provider}`,
    )
  }
}

function liveKitFromEnvironment(): AgentRuntime | null {
  const baseUrl = process.env.LIVEKIT_AGENT_RUNTIME_URL?.trim()
  if (!baseUrl) return null
  const timeout = Number(process.env.LIVEKIT_AGENT_RUNTIME_TIMEOUT_MS)
  return new LiveKitAgentRuntime({
    baseUrl,
    token: process.env.LIVEKIT_AGENT_RUNTIME_TOKEN,
    timeoutMs: Number.isInteger(timeout) && timeout > 0 ? timeout : undefined,
  })
}

export const agentRuntimeFactory = new AgentRuntimeFactory()
