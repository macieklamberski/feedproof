import { describe, expect, it } from 'bun:test'
import { extractGeoriot } from './georiot.js'

describe('extractGeoriot', () => {
  it('should extract target from GR_URL param', () => {
    const url = new URL(
      'https://target.georiot.com/?GR_URL=https%3A%2F%2Fexample.com%2Fproduct',
    )

    expect(extractGeoriot(url)).toBe('https://example.com/product')
  })

  it('should return null when GR_URL param is missing', () => {
    const url = new URL('https://target.georiot.com/?other=value')

    expect(extractGeoriot(url)).toBeNull()
  })

  it('should return null for non-georiot hosts', () => {
    const url = new URL('https://example.com/?GR_URL=https%3A%2F%2Fother.com')

    expect(extractGeoriot(url)).toBeNull()
  })
})
