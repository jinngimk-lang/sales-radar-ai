import assert from 'node:assert/strict'
import { delimiter, dirname } from 'node:path'
import { describe, it } from 'node:test'
import {
  buildAgentReachProcessEnv,
  findAgentReachExecutable,
} from '../src/utils/agent-reach-runtime.js'

describe('Agent Reach runtime environment', () => {
  it('prepends the active Node directory to a child process PATH', () => {
    const executable =
      process.platform === 'win32'
        ? 'C:\\runtime\\node\\node.exe'
        : '/runtime/node/node'
    const originalPath =
      process.platform === 'win32'
        ? 'C:\\Windows\\System32'
        : '/usr/local/bin'

    const environment = buildAgentReachProcessEnv(
      { PATH: originalPath, KEEP_ME: 'yes' },
      executable,
    )

    assert.equal(
      environment.PATH,
      [dirname(executable), originalPath].join(delimiter),
    )
    assert.equal(environment.KEEP_ME, 'yes')
  })

  it('does not duplicate an existing Node directory', () => {
    const executable =
      process.platform === 'win32'
        ? 'C:\\runtime\\node\\node.exe'
        : '/runtime/node/node'
    const nodeDirectory = dirname(executable)
    const originalPath = [nodeDirectory, '/other'].join(delimiter)

    const environment = buildAgentReachProcessEnv(
      { Path: originalPath },
      executable,
    )

    assert.equal(environment.PATH, originalPath)
    assert.equal(environment.Path, undefined)
  })

  it('resolves an explicitly configured executable path', () => {
    assert.equal(findAgentReachExecutable(process.execPath), process.execPath)
  })

  it('reports a missing command without exposing environment values', () => {
    assert.equal(
      findAgentReachExecutable('missing-mcporter-runtime', { PATH: '' }),
      null,
    )
  })
})
