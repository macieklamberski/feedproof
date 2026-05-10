import { describe, expect, it } from 'bun:test'
import { extractGoogleAmpViewer } from './googleAmpViewer.js'

describe('extractGoogleAmpViewer', () => {
  it('should extract https target from /amp/s/ path', () => {
    const url = new URL('https://www.google.com/amp/s/example.com/article')

    expect(extractGoogleAmpViewer(url)).toBe('https://example.com/article')
  })

  it('should extract http target from /amp/ path without s/', () => {
    const url = new URL('https://www.google.com/amp/example.com/article')

    expect(extractGoogleAmpViewer(url)).toBe('http://example.com/article')
  })

  it('should accept google.de host', () => {
    const url = new URL('https://www.google.de/amp/s/example.com/article')

    expect(extractGoogleAmpViewer(url)).toBe('https://example.com/article')
  })

  it('should accept google.com without www subdomain', () => {
    const url = new URL('https://google.com/amp/s/example.com/article')

    expect(extractGoogleAmpViewer(url)).toBe('https://example.com/article')
  })

  it('should preserve nested path segments', () => {
    const url = new URL('https://www.google.com/amp/s/example.com/section/sub/article?id=42')

    expect(extractGoogleAmpViewer(url)).toBe('https://example.com/section/sub/article')
  })

  it('should return null for non-/amp/ paths', () => {
    const url = new URL('https://www.google.com/search?q=test')

    expect(extractGoogleAmpViewer(url)).toBeUndefined()
  })

  it('should return null for non-Google hosts', () => {
    const url = new URL('https://example.com/amp/s/example.com/article')

    expect(extractGoogleAmpViewer(url)).toBeUndefined()
  })
})
