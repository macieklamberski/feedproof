import { describe, expect, it } from 'bun:test'
import { extractTumblr } from './tumblr.js'

describe('extractTumblr', () => {
  it('should extract target from z param', () => {
    const url = new URL(
      'https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Fpost&t=signature',
    )

    expect(extractTumblr(url)).toBe('https://example.com/post')
  })

  it('should return null when z param is missing', () => {
    const url = new URL('https://t.umblr.com/redirect?t=signature')

    expect(extractTumblr(url)).toBeNull()
  })

  it('should return null for non-redirect Tumblr paths', () => {
    const url = new URL('https://t.umblr.com/dashboard?z=https%3A%2F%2Fexample.com')

    expect(extractTumblr(url)).toBeNull()
  })

  it('should return null for non-Tumblr hosts', () => {
    const url = new URL('https://example.com/redirect?z=https%3A%2F%2Fother.com')

    expect(extractTumblr(url)).toBeNull()
  })
})
