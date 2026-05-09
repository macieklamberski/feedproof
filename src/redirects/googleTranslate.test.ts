import { describe, expect, it } from 'bun:test'
import { extractGoogleTranslateRedirect } from './googleTranslate.js'

describe('extractGoogleTranslateRedirect', () => {
  it('should extract target from u param', () => {
    const url = new URL(
      'https://translate.google.com/translate?u=https%3A%2F%2Fexample.com%2Fpage&sl=fr&tl=en',
    )

    expect(extractGoogleTranslateRedirect(url)).toBe('https://example.com/page')
  })

  it('should return null for non-redirect Translate URLs', () => {
    const url = new URL('https://translate.google.com/about')

    expect(extractGoogleTranslateRedirect(url)).toBeUndefined()
  })

  it('should return null when u param is missing', () => {
    const url = new URL('https://translate.google.com/translate?sl=fr&tl=en')

    expect(extractGoogleTranslateRedirect(url)).toBeUndefined()
  })

  it('should return null for non-Translate hosts', () => {
    const url = new URL('https://www.google.com/translate?u=https%3A%2F%2Fexample.com')

    expect(extractGoogleTranslateRedirect(url)).toBeUndefined()
  })

  it('should extract target from translate.google.de host', () => {
    const url = new URL(
      'https://translate.google.de/translate?u=https%3A%2F%2Fexample.com%2Fpage&sl=fr&tl=en',
    )

    expect(extractGoogleTranslateRedirect(url)).toBe('https://example.com/page')
  })

  it('should extract target from translate.google.co.uk host', () => {
    const url = new URL(
      'https://translate.google.co.uk/translate?u=https%3A%2F%2Fexample.com%2Fpage&sl=fr&tl=en',
    )

    expect(extractGoogleTranslateRedirect(url)).toBe('https://example.com/page')
  })
})
