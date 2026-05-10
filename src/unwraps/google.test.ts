import { describe, expect, it } from 'bun:test'
import { unwrapGoogleUrl } from './google.js'

describe('unwrapGoogleUrl', () => {
  it('should extract target from url param', () => {
    const url = new URL('https://www.google.com/url?url=https%3A%2F%2Fexample.com%2Fpage')

    expect(unwrapGoogleUrl(url)).toBe('https://example.com/page')
  })

  it('should extract target from q param', () => {
    const url = new URL('https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fpage')

    expect(unwrapGoogleUrl(url)).toBe('https://example.com/page')
  })

  it('should prefer url param over q param', () => {
    const url = new URL(
      'https://www.google.com/url?url=https%3A%2F%2Freal.com&q=https%3A%2F%2Fwrong.com',
    )

    expect(unwrapGoogleUrl(url)).toBe('https://real.com')
  })

  it('should return null for non-redirect Google URLs', () => {
    const url = new URL('https://www.google.com/search?q=test')

    expect(unwrapGoogleUrl(url)).toBeUndefined()
  })

  it('should return null when target param is missing', () => {
    const url = new URL('https://www.google.com/url?sa=t&source=web')

    expect(unwrapGoogleUrl(url)).toBeUndefined()
  })

  it('should return null for non-Google hosts', () => {
    const url = new URL('https://example.com/url?url=https%3A%2F%2Fother.com')

    expect(unwrapGoogleUrl(url)).toBeUndefined()
  })

  it('should extract target from google.de host', () => {
    const url = new URL('https://www.google.de/url?url=https%3A%2F%2Fexample.com%2Fpage')

    expect(unwrapGoogleUrl(url)).toBe('https://example.com/page')
  })

  it('should extract target from google.co.uk host', () => {
    const url = new URL('https://www.google.co.uk/url?url=https%3A%2F%2Fexample.com%2Fpage')

    expect(unwrapGoogleUrl(url)).toBe('https://example.com/page')
  })

  it('should extract target without www subdomain', () => {
    const url = new URL('https://google.com/url?url=https%3A%2F%2Fexample.com%2Fpage')

    expect(unwrapGoogleUrl(url)).toBe('https://example.com/page')
  })
})
