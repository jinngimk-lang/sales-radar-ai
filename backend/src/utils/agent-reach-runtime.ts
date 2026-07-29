import { delimiter, dirname } from 'node:path'

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
