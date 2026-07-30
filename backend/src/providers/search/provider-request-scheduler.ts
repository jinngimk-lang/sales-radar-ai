type WaitForSlot = (delayMs: number) => Promise<void>
type ReadClock = () => number

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

/**
 * Serializes calls to a rate-limited external provider.
 *
 * This does not fabricate or cache provider data. It only spaces real provider
 * requests so concurrent SearchTasks do not create an avoidable request burst.
 */
export class ProviderRequestScheduler {
  private queue: Promise<void> = Promise.resolve()
  private lastStartedAt: number | null = null

  constructor(
    private readonly minimumIntervalMs: number,
    private readonly waitForSlot: WaitForSlot = wait,
    private readonly readClock: ReadClock = Date.now,
  ) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue.catch(() => undefined)
    let release!: () => void
    this.queue = new Promise<void>((resolve) => {
      release = resolve
    })

    await previous

    try {
      if (this.lastStartedAt !== null) {
        const elapsed = this.readClock() - this.lastStartedAt
        const delayMs = Math.max(0, this.minimumIntervalMs - elapsed)
        if (delayMs > 0) {
          await this.waitForSlot(delayMs)
        }
      }

      this.lastStartedAt = this.readClock()
      return await operation()
    } finally {
      release()
    }
  }
}
