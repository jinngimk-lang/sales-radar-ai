import { accessSync, constants, readFileSync } from 'node:fs'
import { delimiter, dirname, isAbsolute, join } from 'node:path'

export interface ExaCredentialStatus {
  configured: boolean
}

export interface ExaMcpRuntimeStatus {
  configPath: string | null
  transport: 'local-stdio' | 'remote-http' | 'unknown'
}

export function resolveAgentReachCommand(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return (
    readEnvironmentValue(
      environment,
      'AGENT_REACH_MCPORTER_PATH',
    )?.trim() ||
    (process.platform === 'win32' ? 'mcporter.cmd' : 'mcporter')
  )
}

export function buildAgentReachProcessEnv(
  baseEnv: NodeJS.ProcessEnv = process.env,
  nodeExecutable: string = process.execPath,
): NodeJS.ProcessEnv {
  const nodeDirectory = dirname(nodeExecutable)
  const pathValue =
    Object.entries(baseEnv).find(([key]) => key.toLowerCase() === 'path')?.[1] ??
    ''
  const pathEntries = pathValue.split(delimiter).filter(Boolean)
  const includesNodeDirectory = pathEntries.some((entry) =>
    process.platform === 'win32'
      ? entry.toLowerCase() === nodeDirectory.toLowerCase()
      : entry === nodeDirectory,
  )

  const environment = { ...baseEnv }
  for (const key of Object.keys(environment)) {
    if (key.toLowerCase() === 'path') delete environment[key]
  }

  const exaApiKey = readEnvironmentValue(baseEnv, 'EXA_API_KEY')?.trim()
  for (const key of Object.keys(environment)) {
    if (key.toLowerCase() === 'exa_api_key') delete environment[key]
  }
  if (exaApiKey) {
    // Exa's local MCP runtime reads this exact environment variable and sends
    // it to the Exa API as an x-api-key header. Keep the secret out of argv,
    // config output, and logs.
    environment.EXA_API_KEY = exaApiKey
  }

  environment.PATH = (
    includesNodeDirectory
      ? pathEntries
      : [nodeDirectory, ...pathEntries]
  ).join(delimiter)

  return environment
}

export function getExaCredentialStatus(
  environment: NodeJS.ProcessEnv = process.env,
): ExaCredentialStatus {
  return {
    configured: Boolean(
      readEnvironmentValue(environment, 'EXA_API_KEY')?.trim(),
    ),
  }
}

export function getExaMcpRuntimeStatus(
  environment: NodeJS.ProcessEnv = process.env,
): ExaMcpRuntimeStatus {
  const configPath =
    readEnvironmentValue(environment, 'MCPORTER_CONFIG')?.trim() || null
  if (!configPath) return { configPath: null, transport: 'unknown' }

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
      mcpServers?: {
        exa?: {
          command?: unknown
          baseUrl?: unknown
          url?: unknown
        }
      }
    }
    const exa = config.mcpServers?.exa
    if (exa?.command === 'exa-mcp-server') {
      return { configPath, transport: 'local-stdio' }
    }
    if (
      typeof exa?.baseUrl === 'string' ||
      typeof exa?.url === 'string'
    ) {
      return { configPath, transport: 'remote-http' }
    }
  } catch {
    // Startup diagnostics must never interrupt the backend process.
  }

  return { configPath, transport: 'unknown' }
}

export function findAgentReachExecutable(
  command: string = resolveAgentReachCommand(),
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  const hasPathSeparator = command.includes('/') || command.includes('\\')
  if (isAbsolute(command) || hasPathSeparator) {
    return canExecute(command) ? command : null
  }

  const pathValue =
    Object.entries(environment).find(([key]) => key.toLowerCase() === 'path')
      ?.[1] ?? ''
  const extensions =
    process.platform === 'win32'
      ? ['', '.exe', '.cmd', '.bat']
      : ['']

  for (const directory of pathValue.split(delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = join(directory, `${command}${extension}`)
      if (canExecute(candidate)) return candidate
    }
  }

  return null
}

function canExecute(path: string): boolean {
  try {
    accessSync(
      path,
      process.platform === 'win32' ? constants.F_OK : constants.X_OK,
    )
    return true
  } catch {
    return false
  }
}

function readEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  name: string,
): string | undefined {
  return Object.entries(environment).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )?.[1]
}
