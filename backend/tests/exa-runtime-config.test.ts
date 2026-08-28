import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

describe('production Exa MCP runtime configuration', () => {
  it('uses the local official Exa MCP process with an environment-backed key', () => {
    const config = JSON.parse(
      readFileSync(
        join(process.cwd(), 'config', 'mcporter.json'),
        'utf8',
      ),
    ) as {
      mcpServers?: {
        exa?: {
          command?: string
          baseUrl?: string
          env?: Record<string, string>
        }
      }
    }
    const exa = config.mcpServers?.exa

    assert.equal(exa?.command, 'exa-mcp-server')
    assert.equal(exa?.baseUrl, undefined)
    assert.equal(exa?.env?.EXA_API_KEY, '${EXA_API_KEY}')
  })

  it('pins Exa MCP while overriding its vulnerable transitive shelljs runtime', () => {
    const dockerfile = readFileSync(
      join(process.cwd(), 'Dockerfile'),
      'utf8',
    )

    assert.match(dockerfile, /mcporter@0\.12\.3/)
    assert.match(dockerfile, /"exa-mcp-server":"3\.2\.1"/)
    assert.match(dockerfile, /"shelljs":"0\.8\.5"/)
    assert.match(dockerfile, /\/opt\/exa-mcp-runtime/)
    assert.match(dockerfile, /shelljs@0\.8\.5/)
    assert.match(dockerfile, /shelljs@0\.3\.0/)
    assert.match(dockerfile, /command -v exa-mcp-server/)
    assert.doesNotMatch(
      dockerfile,
      /npm install --global[^\n]*exa-mcp-server@3\.2\.1/,
    )
    assert.doesNotMatch(dockerfile, /EXA_API_KEY\s*=/)
    assert.doesNotMatch(dockerfile, /RUN\s+mcporter\s+config\s+get/)
  })

  it('allows enough time for the Railway container healthcheck', () => {
    const railwayConfig = JSON.parse(
      readFileSync(join(process.cwd(), 'railway.json'), 'utf8'),
    ) as {
      deploy?: {
        healthcheckPath?: string
        healthcheckTimeout?: number
      }
    }

    assert.equal(railwayConfig.deploy?.healthcheckPath, '/api/health')
    assert.equal(railwayConfig.deploy?.healthcheckTimeout, 300)
  })
})
