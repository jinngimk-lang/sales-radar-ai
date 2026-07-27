import { app } from './app.js'
import { env } from './config/env.js'

const server = app.listen(env.port, () => {
  console.log(`Sales Radar AI backend listening on port ${env.port}`)
})

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`)
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
