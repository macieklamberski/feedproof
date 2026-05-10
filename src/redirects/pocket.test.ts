import { describe, expect, it } from 'bun:test'
import { extractPocketRedirect } from './pocket.js'

describe('extractPocketRedirect', () => {
  it('should extract target from url param', () => {
    const url = new URL('https://getpocket.com/redirect?url=https%3A%2F%2Fexample.com%2Fstory')

    expect(extractPocketRedirect(url)).toBe('https://example.com/story')
  })

  it('should return null for non-redirect Pocket URLs', () => {
    const url = new URL('https://getpocket.com/explore')

    expect(extractPocketRedirect(url)).toBeUndefined()
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://getpocket.com/redirect')

    expect(extractPocketRedirect(url)).toBeUndefined()
  })

  it('should return null for non-Pocket hosts', () => {
    const url = new URL('https://example.com/redirect?url=https%3A%2F%2Fother.com')

    expect(extractPocketRedirect(url)).toBeUndefined()
  })
})
