import { describe, expect, it } from 'bun:test'
import { extractMozillaOutgoing } from './mozillaOutgoing.js'

describe('extractMozillaOutgoing', () => {
  it('should decode target from AWS host path', () => {
    const sha = 'a'.repeat(64)
    const url = new URL(
      `https://outgoing.prod.mozaws.net/v1/${sha}/https%3A%2F%2Fexample.com%2Farticle`,
    )

    expect(extractMozillaOutgoing(url)).toBe('https://example.com/article')
  })

  it('should decode target from GCP host path', () => {
    const sha = 'b'.repeat(64)
    const url = new URL(
      `https://prod.outgoing.prod.webservices.mozgcp.net/v1/${sha}/https%3A%2F%2Fexample.com%2Fpage`,
    )

    expect(extractMozillaOutgoing(url)).toBe('https://example.com/page')
  })

  it('should return null for non-Mozilla hosts', () => {
    const sha = 'c'.repeat(64)
    const url = new URL(`https://example.com/v1/${sha}/https%3A%2F%2Fother.com`)

    expect(extractMozillaOutgoing(url)).toBeNull()
  })

  it('should return null when path lacks /v1/<sha256>/ prefix', () => {
    const url = new URL('https://outgoing.prod.mozaws.net/other?url=https%3A%2F%2Fexample.com')

    expect(extractMozillaOutgoing(url)).toBeNull()
  })

  it('should return null when encoded target has malformed percent escapes', () => {
    const sha = 'd'.repeat(64)
    const url = new URL(`https://outgoing.prod.mozaws.net/v1/${sha}/bad%ZZ`)

    expect(extractMozillaOutgoing(url)).toBeNull()
  })
})
