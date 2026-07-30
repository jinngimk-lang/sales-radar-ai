import { startBackendServer } from './server-lifecycle.js'

const server = startBackendServer()

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`)
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
