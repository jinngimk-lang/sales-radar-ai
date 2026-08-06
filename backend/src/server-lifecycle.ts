import type { Server } from 'node:http'
import type { Express } from 'express'
import { app } from './app.js'
import { env } from './config/env.js'
import { getRevenueLiveConfig } from './config/revenue-live.config.js'
import { ensureDemoUser } from './services/demo-user.service.js'
import { revenueLiveService } from './services/revenue-live.service.js'
import {
  createRevenueLiveLoopWorker,
  type RevenueLiveLoopWorker,
} from './workers/revenue-live-loop.worker.js'
import {
  findAgentReachExecutable,
  getExaCredentialStatus,
  getExaMcpRuntimeStatus,
  resolveAgentReachCommand,
} from './utils/agent-reach-runtime.js'

export interface ServerLifecycleLogger {
  log(message: string): void
  warn(message: string): void
}

export interface StartBackendServerOptions {
  application?: Express
  port?: number
  logger?: ServerLifecycleLogger
  runtimeDiagnostics?: () => void | Promise<void>
  revenueLiveLoop?: RevenueLiveLoopWorker
}

export function startBackendServer(
  options: StartBackendServerOptions = {},
): Server {
  const application = options.application ?? app
  const port = options.port ?? env.port
  const logger = options.logger ?? console
  const runtimeDiagnostics =
    options.runtimeDiagnostics ??
    (() => logAgentReachRuntimeDiagnostics(logger))
  const revenueLiveLoop =
    options.revenueLiveLoop ?? createProductionRevenueLiveLoop(logger)

  const server = application.listen(port, () => {
    const listeningPort = readListeningPort(server, port)
    logger.log(`Sales Radar AI backend listening on port ${listeningPort}`)

    // Provider diagnostics and optional cloud-browser work deliberately remain
    // outside the healthcheck-critical startup path.
    setImmediate(() => {
      void Promise.resolve()
        .then(runtimeDiagnostics)
        .catch(() => {
          logger.warn(
            '[runtime] AgentReach diagnostics unavailable; backend remains healthy and the provider will be checked during search.',
          )
        })
      revenueLiveLoop.start()
    })
  })

  server.once('close', () => {
    revenueLiveLoop.stop()
  })

  return server
}

export function createProductionRevenueLiveLoop(
  logger: ServerLifecycleLogger = console,
): RevenueLiveLoopWorker {
  const config = getRevenueLiveConfig()
  return createRevenueLiveLoopWorker({
    enabled: config.loopEnabled,
    configured: config.providerConfigured,
    intervalMinutes: config.loopIntervalMinutes,
    resolveUserId: async () => (await ensureDemoUser()).id,
    runNext: (userId) => revenueLiveService.runNextEligibleOpportunity(userId),
    logger,
  })
}

export function logAgentReachRuntimeDiagnostics(
  logger: ServerLifecycleLogger = console,
  environment: NodeJS.ProcessEnv = process.env,
): void {
  const mcporterCommand = resolveAgentReachCommand(environment)
  const mcporterPath = findAgentReachExecutable(
    mcporterCommand,
    environment,
  )
  const exaMcpPath = findAgentReachExecutable(
    'exa-mcp-server',
    environment,
  )
  const exaCredentialStatus = getExaCredentialStatus(environment)
  const exaMcpRuntimeStatus = getExaMcpRuntimeStatus(environment)

  logger.log(`[runtime] node.version=${process.version}`)
  logger.log(`[runtime] mcporter.command=${mcporterCommand}`)
  logger.log(`[runtime] mcporter.path=${mcporterPath ?? 'not-found'}`)
  logger.log(`[runtime] mcporter.exists=${mcporterPath !== null}`)
  logger.log(`[runtime] exa-mcp.path=${exaMcpPath ?? 'not-found'}`)
  logger.log(`[runtime] exa-mcp.exists=${exaMcpPath !== null}`)
  logger.log(
    `[runtime] mcporter.config=${exaMcpRuntimeStatus.configPath ?? 'auto-discovery'}`,
  )
  logger.log(`[runtime] exa-mcp.transport=${exaMcpRuntimeStatus.transport}`)
  logger.log('[runtime] exa-mcp.auth=x-api-key')
  logger.log(
    `[runtime] exa-mcp.credential.configured=${exaCredentialStatus.configured}`,
  )
}

function readListeningPort(server: Server, fallback: number): number {
  const address = server.address()
  return address && typeof address === 'object' ? address.port : fallback
}
