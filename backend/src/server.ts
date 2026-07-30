import { app } from './app.js'
import { env } from './config/env.js'
import {
  findAgentReachExecutable,
  resolveAgentReachCommand,
} from './utils/agent-reach-runtime.js'

const mcporterCommand = resolveAgentReachCommand()
const mcporterPath = findAgentReachExecutable(mcporterCommand)

console.log(`[runtime] node.version=${process.version}`)
console.log(`[runtime] mcporter.command=${mcporterCommand}`)
console.log(`[runtime] mcporter.path=${mcporterPath ?? 'not-found'}`)
console.log(`[runtime] mcporter.exists=${mcporterPath !== null}`)

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
