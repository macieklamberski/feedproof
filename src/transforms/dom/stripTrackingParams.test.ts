import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { stripTrackingParams } from './stripTrackingParams.js'

describeForEachParser('stripTrackingParams', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripTrackingParams(context)])
  }

  it('should strip utm_source from links', async () => {
    const value = '<a href="https://example.com/page?utm_source=rss">link</a>'
    const result = await transform(value)

    expect(result).not.toContain('utm_source')
    expect(result).toContain('https://example.com/page')
  })

  it('should strip multiple tracking params from a single link', async () => {
    const value =
      '<a href="https://example.com/?utm_source=rss&utm_medium=feed&utm_campaign=post">link</a>'
    const result = await transform(value)

    expect(result).not.toContain('utm_source')
    expect(result).not.toContain('utm_medium')
    expect(result).not.toContain('utm_campaign')
  })

  it('should preserve non-tracking query params', async () => {
    const value = '<a href="https://example.com/?id=123&utm_source=rss&page=2">link</a>'
    const result = await transform(value)

    expect(result).toContain('id=123')
    expect(result).toContain('page=2')
    expect(result).not.toContain('utm_source')
  })

  it('should not modify links without tracking params', async () => {
    const value = '<a href="https://example.com/page?id=42">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com/page?id=42"')
  })

  it('should handle links with no query params', async () => {
    const value = '<a href="https://example.com/page">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com/page"')
  })

  it('should handle invalid URLs gracefully', async () => {
    const value = '<a href="not-a-valid-url">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="not-a-valid-url"')
  })

  it('should handle relative URLs gracefully', async () => {
    const value = '<a href="/page?utm_source=rss">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="/page?utm_source=rss"')
  })

  it('should remove query string entirely when all params are tracking', async () => {
    const value = '<a href="https://example.com/?utm_source=rss&utm_medium=feed">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com/"')
    expect(result).not.toContain('utm_source')
    expect(result).not.toContain('utm_medium')
  })

  it('should handle html with no links', async () => {
    const value = '<p>No links here</p>'
    const result = await transform(value)

    expect(result).toContain('<p>No links here</p>')
  })

  it('should strip non-utm tracking params', async () => {
    const value = '<a href="https://example.com/?fbclid=abc&gclid=def&id=42">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com/?id=42"')
  })

  it('should be idempotent', async () => {
    const value = '<a href="https://example.com/page?utm_source=rss">link</a>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
