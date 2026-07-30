import assert from 'node:assert/strict'
import { delimiter, dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import {
  buildAgentReachProcessEnv,
  findAgentReachExecutable,
  getExaCredentialStatus,
  getExaMcpRuntimeStatus,
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

  it('injects a normalized EXA_API_KEY into the MCP child process', () => {
    const environment = buildAgentReachProcessEnv(
      {
        PATH: process.env.PATH,
        exa_api_key: '  runtime-credential-probe  ',
      },
      process.execPath,
    )

    assert.equal(environment.EXA_API_KEY, 'runtime-credential-probe')
    assert.equal(environment.exa_api_key, undefined)
    assert.deepEqual(getExaCredentialStatus(environment), {
      configured: true,
    })
  })

  it('reports credential availability without returning credential data', () => {
    assert.deepEqual(
      getExaCredentialStatus({ EXA_API_KEY: '  configured  ' }),
      { configured: true },
    )
    assert.deepEqual(getExaCredentialStatus({ EXA_API_KEY: '   ' }), {
      configured: false,
    })
  })

  it('reports the configured local Exa MCP transport without reading secrets', () => {
    const configPath = join(process.cwd(), 'config', 'mcporter.json')

    assert.deepEqual(
      getExaMcpRuntimeStatus({
        MCPORTER_CONFIG: configPath,
        EXA_API_KEY: 'must-not-be-returned',
      }),
      {
        configPath,
        transport: 'local-stdio',
      },
    )
  })

  it('reports a missing command without exposing environment values', () => {
    assert.equal(
      findAgentReachExecutable('missing-mcporter-runtime', { PATH: '' }),
      null,
    )
  })
})
