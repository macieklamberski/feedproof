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
  it('should strip utm_source from links', () => {
    const html = '<a href="https://example.com/page?utm_source=rss">link</a>'
    const result = transformHtml(html, stripTrackingParams(context))

    expect(result).not.toContain('utm_source')
    expect(result).toContain('https://example.com/page')
  })

  it('should strip multiple tracking params from a single link', () => {
    const html =
      '<a href="https://example.com/?utm_source=rss&utm_medium=feed&utm_campaign=post">link</a>'
    const result = transformHtml(html, stripTrackingParams(context))

    expect(result).not.toContain('utm_source')
    expect(result).not.toContain('utm_medium')
    expect(result).not.toContain('utm_campaign')
  })

  it('should preserve non-tracking query params', () => {
    const html = '<a href="https://example.com/?id=123&utm_source=rss&page=2">link</a>'
    const result = transformHtml(html, stripTrackingParams(context))

    expect(result).toContain('id=123')
    expect(result).toContain('page=2')
    expect(result).not.toContain('utm_source')
  })

  it('should not modify links without tracking params', () => {
    const html = '<a href="https://example.com/page?id=42">link</a>'
    const result = transformHtml(html, stripTrackingParams(context))

    expect(result).toContain('href="https://example.com/page?id=42"')
  })

  it('should handle links with no query params', () => {
    const html = '<a href="https://example.com/page">link</a>'
    const result = transformHtml(html, stripTrackingParams(context))

    expect(result).toContain('href="https://example.com/page"')
  })

  it('should handle invalid URLs gracefully', () => {
    const html = '<a href="not-a-valid-url">link</a>'
    const result = transformHtml(html, stripTrackingParams(context))

    expect(result).toContain('href="not-a-valid-url"')
  })

  it('should handle relative URLs gracefully', () => {
    const html = '<a href="/page?utm_source=rss">link</a>'
    const result = transformHtml(html, stripTrackingParams(context))

    expect(result).toContain('href="/page?utm_source=rss"')
  })

  it('should remove query string entirely when all params are tracking', () => {
    const html = '<a href="https://example.com/?utm_source=rss&utm_medium=feed">link</a>'
    const result = transformHtml(html, stripTrackingParams(context))

    expect(result).toContain('href="https://example.com/"')
    expect(result).not.toContain('utm_source')
    expect(result).not.toContain('utm_medium')
  })

  it('should handle html with no links', () => {
    const html = '<p>No links here</p>'
    const result = transformHtml(html, stripTrackingParams(context))

    expect(result).toContain('<p>No links here</p>')
  })

  it('should strip non-utm tracking params', () => {
    const html = '<a href="https://example.com/?fbclid=abc&gclid=def&id=42">link</a>'
    const result = transformHtml(html, stripTrackingParams(context))

    expect(result).toContain('href="https://example.com/?id=42"')
  })
})
