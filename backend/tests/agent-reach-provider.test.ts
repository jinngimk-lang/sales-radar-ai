import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  inspectAgentReachOutput,
  parseAgentReachOutput,
} from '../src/providers/search/agent-reach.provider.js'

describe('AgentReachProvider response parser', () => {
  it('parses structured Exa results', () => {
    const results = parseAgentReachOutput(
      JSON.stringify({
        results: [
          {
            title: 'Industrial automation supplier discussion',
            url: 'https://www.reddit.com/r/automation/comments/example',
            text: 'A public discussion about industrial automation suppliers.',
          },
        ],
      }),
    )

    assert.equal(results.length, 1)
    assert.equal(
      results[0]?.url,
      'https://www.reddit.com/r/automation/comments/example',
    )
    assert.match(results[0]?.text ?? '', /industrial automation/i)
  })

  it('parses human-readable mcporter output', () => {
    const results = parseAgentReachOutput(`
Title: Automation supplier recommendations
URL: https://www.reddit.com/r/manufacturing/comments/example
Text: Looking for industrial automation supplier recommendations in the USA.
`)

    assert.equal(results.length, 1)
    assert.equal(results[0]?.title, 'Automation supplier recommendations')
    assert.match(results[0]?.text ?? '', /supplier recommendations/i)
  })

  it('extracts real Exa text fields and ignores unavailable authors', () => {
    const results = parseAgentReachOutput(`
Title: Automation integrators in the USA
URL: https://www.reddit.com/r/PLC/comments/example
Published: 2026-07-24T00:00:00.000Z
Author: N/A
Highlights:
Fori Automation and Kuka Systems support automotive production lines.
`)

    assert.equal(results.length, 1)
    assert.equal(results[0]?.author, undefined)
    assert.equal(results[0]?.publishedAt, '2026-07-24T00:00:00.000Z')
    assert.match(results[0]?.text ?? '', /^Fori Automation/)
  })

  it('reports safe response diagnostics without returning raw content', () => {
    const rawOutput = JSON.stringify({
      results: [
        {
          title: 'Sensitive internal-looking title',
          url: 'https://example.com/private-path',
          text: 'Do not emit this content in diagnostics',
        },
      ],
    })

    const diagnostics = inspectAgentReachOutput(rawOutput)

    assert.equal(diagnostics.format, 'json')
    assert.deepEqual(diagnostics.containerKeys, ['results'])
    assert.equal(diagnostics.urlMarkerCount, 1)
    assert.doesNotMatch(
      JSON.stringify(diagnostics),
      /Sensitive internal-looking title|private-path|Do not emit/,
    )
  })
})
