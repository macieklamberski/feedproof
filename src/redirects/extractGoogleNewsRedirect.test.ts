import { describe, expect, it } from 'bun:test'
import { extractGoogleNewsRedirect } from './extractGoogleNewsRedirect.js'

describe('extractGoogleNewsRedirect', () => {
  it('should extract target from legacy news.google.com/news/url', () => {
    const url = new URL('https://news.google.com/news/url?url=https%3A%2F%2Fexample.com%2Farticle')

    expect(extractGoogleNewsRedirect(url)).toBe('https://example.com/article')
  })

  it('should return null for modern article URLs', () => {
    const url = new URL('https://news.google.com/articles/CBMiAbase64')

    expect(extractGoogleNewsRedirect(url)).toBeNull()
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://news.google.com/news/url')

    expect(extractGoogleNewsRedirect(url)).toBeNull()
  })

  it('should return null for non-Google-News hosts', () => {
    const url = new URL('https://www.google.com/news/url?url=https%3A%2F%2Fexample.com')

    expect(extractGoogleNewsRedirect(url)).toBeNull()
  })
})
