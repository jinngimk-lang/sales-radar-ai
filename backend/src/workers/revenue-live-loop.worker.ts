export interface RevenueLiveLoopLogger {
  log(message: string): void
  warn(message: string): void
}

export interface RevenueLiveLoopWorkerOptions {
  enabled: boolean
  configured: boolean
  intervalMinutes: number
  resolveUserId(): Promise<string>
  runNext(userId: string): Promise<unknown>
  setIntervalImpl?: typeof setInterval
  clearIntervalImpl?: typeof clearInterval
  logger?: RevenueLiveLoopLogger
}

export interface RevenueLiveLoopWorker {
  start(): void
  stop(): void
}

export function createRevenueLiveLoopWorker(
  options: RevenueLiveLoopWorkerOptions,
): RevenueLiveLoopWorker {
  const setIntervalImpl = options.setIntervalImpl ?? setInterval
  const clearIntervalImpl = options.clearIntervalImpl ?? clearInterval
  const logger = options.logger ?? console
  const intervalMilliseconds = Math.max(5, options.intervalMinutes) * 60_000

  let timer: NodeJS.Timeout | null = null
  let running = false

  const tick = async () => {
    if (running) return
    running = true
    try {
      const userId = await options.resolveUserId()
      await options.runNext(userId)
    } catch {
      logger.warn(
        '[revenue-live] Cloud browser loop iteration failed; details are available through the protected operations timeline.',
      )
    } finally {
      running = false
    }
  }

  return {
    start() {
      if (timer || !options.enabled || !options.configured) return
      logger.log(
        `[revenue-live] Read-only cloud browser loop enabled; interval=${Math.round(intervalMilliseconds / 60_000)}m`,
      )
      void tick()
      timer = setIntervalImpl(() => {
        void tick()
      }, intervalMilliseconds)
    },

    stop() {
      if (!timer) return
      clearIntervalImpl(timer)
      timer = null
    },
  }
}
