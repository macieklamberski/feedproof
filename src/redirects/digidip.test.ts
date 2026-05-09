import { describe, expect, it } from 'bun:test'
import { extractDigidip } from './digidip.js'

describe('extractDigidip', () => {
  it('should extract target from url param', () => {
    const url = new URL(
      'https://example.digidip.net/visit?url=https%3A%2F%2Fexample.com%2Fproduct',
    )

    expect(extractDigidip(url)).toBe('https://example.com/product')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://example.digidip.net/visit?other=value')

    expect(extractDigidip(url)).toBeNull()
  })

  it('should return null for non-digidip hosts', () => {
    const url = new URL('https://example.com/?url=https%3A%2F%2Fother.com')

    expect(extractDigidip(url)).toBeNull()
  })
})
