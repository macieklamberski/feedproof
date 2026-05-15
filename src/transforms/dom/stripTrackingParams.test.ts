import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { stripTrackingParams } from './stripTrackingParams.js'

const context: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('stripTrackingParams', () => {
  const transform = (html: string) => {
    return transformHtml(html, stripTrackingParams(context))
  }

  it('should strip utm_source from links', async () => {
    const result = await transform('<a href="https://example.com/page?utm_source=rss">link</a>')

    expect(result).not.toContain('utm_source')
    expect(result).toContain('https://example.com/page')
  })

  it('should strip multiple tracking params from a single link', async () => {
    const result = await transform(
      '<a href="https://example.com/?utm_source=rss&utm_medium=feed&utm_campaign=post">link</a>',
    )

    expect(result).not.toContain('utm_source')
    expect(result).not.toContain('utm_medium')
    expect(result).not.toContain('utm_campaign')
  })

  it('should preserve non-tracking query params', async () => {
    const result = await transform(
      '<a href="https://example.com/?id=123&utm_source=rss&page=2">link</a>',
    )

    expect(result).toContain('id=123')
    expect(result).toContain('page=2')
    expect(result).not.toContain('utm_source')
  })

  it('should not modify links without tracking params', async () => {
    const result = await transform('<a href="https://example.com/page?id=42">link</a>')

    expect(result).toContain('href="https://example.com/page?id=42"')
  })

  it('should handle links with no query params', async () => {
    const result = await transform('<a href="https://example.com/page">link</a>')

    expect(result).toContain('href="https://example.com/page"')
  })

  it('should handle invalid URLs gracefully', async () => {
    const result = await transform('<a href="not-a-valid-url">link</a>')

    expect(result).toContain('href="not-a-valid-url"')
  })

  it('should handle relative URLs gracefully', async () => {
    const result = await transform('<a href="/page?utm_source=rss">link</a>')

    expect(result).toContain('href="/page?utm_source=rss"')
  })

  it('should remove query string entirely when all params are tracking', async () => {
    const result = await transform(
      '<a href="https://example.com/?utm_source=rss&utm_medium=feed">link</a>',
    )

    expect(result).toContain('href="https://example.com/"')
    expect(result).not.toContain('utm_source')
    expect(result).not.toContain('utm_medium')
  })

  it('should handle html with no links', async () => {
    const result = await transform('<p>No links here</p>')

    expect(result).toContain('<p>No links here</p>')
  })

  it('should strip non-utm tracking params', async () => {
    const result = await transform(
      '<a href="https://example.com/?fbclid=abc&gclid=def&id=42">link</a>',
    )

    expect(result).toContain('href="https://example.com/?id=42"')
  })
})
