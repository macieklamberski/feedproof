import { describe, expect, it } from 'bun:test'
import { extractEffiliation } from './effiliation.js'

describe('extractEffiliation', () => {
  it('should extract target from url param', () => {
    const url = new URL(
      'https://track.effiliation.com/?url=https%3A%2F%2Fexample.com%2Fproduct',
    )

    expect(extractEffiliation(url)).toBe('https://example.com/product')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://track.effiliation.com/?other=value')

    expect(extractEffiliation(url)).toBeNull()
  })

  it('should return null for non-effiliation hosts', () => {
    const url = new URL('https://example.com/?url=https%3A%2F%2Fother.com')

    expect(extractEffiliation(url)).toBeNull()
  })
})
