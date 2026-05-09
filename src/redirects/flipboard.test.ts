import { describe, expect, it } from 'bun:test'
import { extractFlipboard } from './flipboard.js'

describe('extractFlipboard', () => {
  it('should extract target from url param', () => {
    const url = new URL('https://flipboard.com/redirect?url=https%3A%2F%2Fexample.com%2Farticle')

    expect(extractFlipboard(url)).toBe('https://example.com/article')
  })

  it('should return null for non-redirect Flipboard URLs', () => {
    const url = new URL('https://flipboard.com/topic/news')

    expect(extractFlipboard(url)).toBeNull()
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://flipboard.com/redirect')

    expect(extractFlipboard(url)).toBeNull()
  })

  it('should return null for non-Flipboard hosts', () => {
    const url = new URL('https://example.com/redirect?url=https%3A%2F%2Fother.com')

    expect(extractFlipboard(url)).toBeNull()
  })
})
