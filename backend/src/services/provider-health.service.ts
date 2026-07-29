import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { AppError } from '../utils/app-error.js'
import {
  buildAgentReachProcessEnv,
  resolveAgentReachCommand,
} from '../utils/agent-reach-runtime.js'

const execFileAsync = promisify(execFile)

export type ProviderHealthState = 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'

export interface ProviderHealth {
  provider: 'agent-reach'
  dependency: 'exa'
  state: ProviderHealthState
  code: string
  message: string
  checkedAt: string
}

export interface ProviderHealthCommandResult {
  stdout: string
  stderr?: string
}

export type ProviderHealthCommand = (
  executable: string,
  args: string[],
) => Promise<ProviderHealthCommandResult>

async function runHealthCommand(
  executable: string,
  args: string[],
): Promise<ProviderHealthCommandResult> {
  const result = await execFileAsync(executable, args, {
    encoding: 'utf8',
    timeout: 5_000,
    windowsHide: true,
    shell: process.platform === 'win32',
    env: buildAgentReachProcessEnv(),
    maxBuffer: 512 * 1024,
  })
  return { stdout: result.stdout, stderr: result.stderr }
}

export class ProviderHealthService {
  constructor(
    private readonly command: ProviderHealthCommand = runHealthCommand,
    private readonly executable = resolveAgentReachCommand(),
  ) {}

  async checkAgentReach(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString()

    try {
      const { stdout, stderr = '' } = await this.command(this.executable, [
        'list',
        '--json',
      ])
      const output = `${stdout}\n${stderr}`.trim()
      const exaStatus = readExaStatus(output)

      if (!exaStatus) {
        return {
          provider: 'agent-reach',
          dependency: 'exa',
          state: 'UNAVAILABLE',
          code: 'EXA_NOT_CONFIGURED',
          message: 'Exa MCP is not configured in mcporter.',
          checkedAt,
        }
      }

      if (!/^(ok|connected|healthy|available|ready)$/i.test(exaStatus)) {
        return {
          provider: 'agent-reach',
          dependency: 'exa',
          state: 'DEGRADED',
          code: 'EXA_UNHEALTHY',
          message: 'Exa MCP is configured but is not healthy.',
          checkedAt,
        }
      }

      return {
        provider: 'agent-reach',
        dependency: 'exa',
        state: 'AVAILABLE',
        code: 'OK',
        message: 'AgentReach runtime and Exa MCP are available.',
        checkedAt,
      }
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : ''
      const message = error instanceof Error ? error.message : String(error)
      const missing =
        code === 'ENOENT' ||
        /not recognized|cannot find|not found|找不到/i.test(message)

      return {
        provider: 'agent-reach',
        dependency: 'exa',
        state: 'UNAVAILABLE',
        code: missing ? 'MCPORTER_NOT_FOUND' : 'PROVIDER_HEALTH_CHECK_FAILED',
        message: missing
          ? `Agent Reach runtime not found: ${this.executable}.`
          : `Provider health check failed: ${message}`,
        checkedAt,
      }
    }
  }

  async requireAgentReach(): Promise<ProviderHealth> {
    const health = await this.checkAgentReach()
    if (health.state !== 'AVAILABLE') {
      throw new AppError(
        503,
        'SEARCH_PROVIDER_UNAVAILABLE',
        health.message,
        {
          provider: health.provider,
          dependency: health.dependency,
          providerState: health.state,
          healthCode: health.code,
          retryable: true,
        },
      )
    }
    return health
  }
}

export const providerHealthService = new ProviderHealthService()

function readExaStatus(output: string): string | null {
  try {
    const parsed = JSON.parse(output) as {
      servers?: Array<{ name?: unknown; status?: unknown }>
    }
    const exa = parsed.servers?.find(
      (server) =>
        typeof server.name === 'string' &&
        server.name.trim().toLowerCase() === 'exa',
    )
    if (exa && typeof exa.status === 'string') return exa.status.trim()
  } catch {
    // Older mcporter versions can return a human-readable server list.
  }

  const exaLine = output
    .split(/\r?\n/)
    .find((line) => /(?:^|\s|[-*])exa(?:\s|$|:|\(|\[)/i.test(line))
  if (!exaLine) return null
  if (/\b(ok|connected|healthy|available|ready)\b/i.test(exaLine)) return 'ok'
  if (
    /\b(offline|unhealthy|disconnected|failed|error|unavailable)\b/i.test(
      exaLine,
    )
  ) {
    return 'offline'
  }
  return 'unknown'
}
