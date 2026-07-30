import { accessSync, constants } from 'node:fs'
import { delimiter, dirname, isAbsolute, join } from 'node:path'

export function resolveAgentReachCommand(): string {
  return (
    process.env.AGENT_REACH_MCPORTER_PATH?.trim() ||
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

  environment.PATH = (
    includesNodeDirectory
      ? pathEntries
      : [nodeDirectory, ...pathEntries]
  ).join(delimiter)

  return environment
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
