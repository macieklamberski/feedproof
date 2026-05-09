import { describe, expect, it } from 'bun:test'
import { extractMailpanion } from './mailpanion.js'

describe('extractMailpanion', () => {
  it('should extract target from destination param', () => {
    const url = new URL(
      'https://mailpanion.com/?destination=https%3A%2F%2Fexample.com%2Fnewsletter',
    )

    expect(extractMailpanion(url)).toBe('https://example.com/newsletter')
  })

  it('should return null when destination param is missing', () => {
    const url = new URL('https://mailpanion.com/?other=value')

    expect(extractMailpanion(url)).toBeNull()
  })

  it('should return null for non-Mailpanion hosts', () => {
    const url = new URL('https://example.com/?destination=https%3A%2F%2Fother.com')

    expect(extractMailpanion(url)).toBeNull()
  })
})
