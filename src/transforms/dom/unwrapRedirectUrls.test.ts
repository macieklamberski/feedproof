import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext, UrlUnwrapper } from '../../types.js'
import { extractRedirectTarget, unwrapRedirectUrls } from './unwrapRedirectUrls.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('unwrapRedirectUrls', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return transformHtml(html, unwrapRedirectUrls(context))
  }

  it('should unwrap a redirect href via the configured extractors', async () => {
    const value =
      '<a href="https://www.google.com/url?url=https%3A%2F%2Fexample.com%2Fpage">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com/page"')
    expect(result).not.toContain('google.com')
  })

  it('should leave non-redirect links untouched', async () => {
    const value = '<a href="https://example.com/page?url=https%3A%2F%2Fother.com">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com/page?url=https%3A%2F%2Fother.com"')
  })

  it('should handle multiple links with mixed redirect and normal', async () => {
    const value = [
      '<a href="https://www.google.com/url?url=https%3A%2F%2Fexample.com">redirect</a>',
      '<a href="https://example.com/normal">normal</a>',
    ].join('')
    const result = await transform(value)

    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('href="https://example.com/normal"')
    expect(result).not.toContain('google.com')
  })

  it('should handle invalid URLs gracefully', async () => {
    const value = '<a href="not-a-valid-url">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="not-a-valid-url"')
  })

  it('should handle links without href', async () => {
    const value = '<a name="anchor">link</a>'
    const result = await transform(value)

    expect(result).toContain('<a name="anchor">')
  })

  describe('overrides', () => {
    it('should ignore default urlUnwrappers when override is provided', async () => {
      const customContext: TransformContext = { ...baseContext, urlUnwrappers: [] }
      const value =
        '<a href="https://www.google.com/url?url=https%3A%2F%2Fexample.com%2Fpage">link</a>'
      const result = await transform(value, customContext)

      expect(result).toContain(
        'href="https://www.google.com/url?url=https%3A%2F%2Fexample.com%2Fpage"',
      )
    })

    it('should use the provided urlUnwrappers', async () => {
      const customExtractor: UrlUnwrapper = (url) => {
        return url.hostname === 'my-shim.example'
          ? (url.searchParams.get('to') ?? undefined)
          : undefined
      }
      const customContext: TransformContext = { ...baseContext, urlUnwrappers: [customExtractor] }
      const value = '<a href="https://my-shim.example/r?to=https%3A%2F%2Ftarget.com">link</a>'
      const result = await transform(value, customContext)

      expect(result).toContain('href="https://target.com"')
    })
  })
})

describe('extractRedirectTarget', () => {
  const matchEverything: UrlUnwrapper = (url) => url.searchParams.get('target') ?? undefined
  const matchNothing: UrlUnwrapper = () => undefined

  it('should return target from first matching extractor', () => {
    const url = new URL('https://example.com/?target=https%3A%2F%2Fdest.com')
    const result = extractRedirectTarget(url, [matchEverything])
    const expected = 'https://dest.com'

    expect(result).toBe(expected)
  })

  it('should fall through to next extractor when first returns undefined', () => {
    const url = new URL('https://example.com/?target=https%3A%2F%2Fdest.com')
    const result = extractRedirectTarget(url, [matchNothing, matchEverything])
    const expected = 'https://dest.com'

    expect(result).toBe(expected)
  })

  it('should return undefined when no extractor matches', () => {
    const url = new URL('https://example.com/page')
    const result = extractRedirectTarget(url, [matchNothing, matchNothing])

    expect(result).toBeUndefined()
  })

  it('should return null for empty extractors array', () => {
    const url = new URL('https://example.com/page')
    const result = extractRedirectTarget(url, [])

    expect(result).toBeUndefined()
  })

  it('should work with defaultUrlUnwrappers', () => {
    const url = new URL('https://www.google.com/url?url=https%3A%2F%2Fexample.com%2Fpage')
    const result = extractRedirectTarget(url, defaultUrlUnwrappers)
    const expected = 'https://example.com/page'

    expect(result).toBe(expected)
  })
})
