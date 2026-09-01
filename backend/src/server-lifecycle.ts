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
    (() => logCrawlerRuntimeDiagnostics(logger))
  const revenueLiveLoop =
    options.revenueLiveLoop ?? createProductionRevenueLiveLoop(logger)

  const server = application.listen(port, () => {
    const listeningPort = readListeningPort(server, port)
    logger.log(`Sales Radar AI backend listening on port ${listeningPort}`)

    // Provider diagnostics and optional legacy revenue-browser reconciliation
    // deliberately remain outside the healthcheck-critical startup path.
    setImmediate(() => {
      void Promise.resolve()
        .then(runtimeDiagnostics)
        .catch(() => {
          logger.warn(
            '[runtime] Crawler diagnostics unavailable; backend remains healthy and the provider will be checked during search.',
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
    reconcile: (userId) => revenueLiveService.reconcileActiveRun(userId),
    logger,
  })
}

/**
 * Reports only crawler capability booleans and never emits tokens or endpoint
 * values. Production search has one active provider: crawler.
 */
export function logCrawlerRuntimeDiagnostics(
  logger: ServerLifecycleLogger = console,
  environment: NodeJS.ProcessEnv = process.env,
): void {
  logger.log(`[runtime] node.version=${process.version}`)
  logger.log('[runtime] search.active-provider=crawler')
  logger.log(
    `[runtime] crawler.gateway.configured=${Boolean(environment.CRAWLER_GATEWAY_URL?.trim())}`,
  )
  logger.log(
    `[runtime] crawler.gateway.token.configured=${Boolean(environment.CRAWLER_GATEWAY_TOKEN?.trim())}`,
  )
  logger.log(
    `[runtime] crawl4ai.configured=${Boolean(environment.CRAWL4AI_BASE_URL?.trim())}`,
  )
  logger.log(
    `[runtime] crawl4ai.token.configured=${Boolean(environment.CRAWL4AI_API_TOKEN?.trim())}`,
  )
  logger.log('[runtime] crawler.direct-http-fallback=true')
}

function readListeningPort(server: Server, fallback: number): number {
  const address = server.address()
  return address && typeof address === 'object' ? address.port : fallback
}
