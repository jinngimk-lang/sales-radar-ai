import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  sanitizeProviderString,
  toSafeJson,
} from '../src/services/safe-json.service.js'

describe('Provider JSON sanitization', () => {
  it('makes malformed provider text safe for Prisma JSON persistence', () => {
    const malformed = {
      path: String.raw`C:\x\invalid\u12`,
      nullByte: `before\u0000after`,
      controls: `one\u0001two`,
      loneSurrogate: `bad\uD800value`,
      nested: [{ text: String.raw`\x` }],
    }
    const sanitized = toSafeJson(malformed)
    const serialized = JSON.stringify(sanitized)

    assert.doesNotThrow(() => JSON.parse(serialized))
    assert.doesNotMatch(serialized, /\u0000|\u0001/)
    assert.match(serialized, /beforeafter/)
  })

  it('sanitizes scalar Exa text before Lead creation', () => {
    assert.equal(sanitizeProviderString(`a\u0000b\u0007c`), 'ab c')
  })
})
