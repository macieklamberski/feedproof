import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import { parseHtml } from '../../parsers/linkedom.js'
import type { TransformContext } from '../../types.js'
import { linkifyUrls } from './linkifyUrls.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('linkifyUrls', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [linkifyUrls(context)])
  }

  it('should link bare https URL', async () => {
    const value = '<p>Visit https://example.com for more</p>'
    const result = await transform(value)

    expect(result).toContain('<a href="https://example.com"')
    expect(result).toContain('https://example.com</a>')
  })

  it('should link bare http URL', async () => {
    const value = '<p>Visit http://example.com for more</p>'
    const result = await transform(value)

    expect(result).toContain('<a href="http://example.com"')
  })

  it('should link URL with path and query', async () => {
    const value = '<p>See https://example.com/path?key=value&other=1#hash for details</p>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com/path?key=value&other=1#hash"')
  })

  it('should link multiple URLs in one paragraph', async () => {
    const value = '<p>See https://one.com and https://two.com</p>'
    const result = await transform(value)

    expect(result.match(/<a /g)).toHaveLength(2)
    expect(result).toContain('href="https://one.com"')
    expect(result).toContain('href="https://two.com"')
  })

  it('should link URLs across multiple paragraphs', async () => {
    const value = '<p>See https://one.com</p><p>And https://two.com</p>'
    const result = await transform(value)

    expect(result.match(/<a /g)).toHaveLength(2)
    expect(result).toContain('href="https://one.com"')
    expect(result).toContain('href="https://two.com"')
  })

  it('should link bare URL while preserving existing links', async () => {
    const value = '<p><a href="https://linked.com">linked</a> and https://bare.com</p>'
    const result = await transform(value)

    expect(result.match(/<a /g)).toHaveLength(2)
    expect(result).toContain('href="https://linked.com"')
    expect(result).toContain('href="https://bare.com"')
  })

  it('should preserve surrounding text when linkifying', async () => {
    const value = '<p>before https://example.com after</p>'
    const result = await transform(value)

    expect(result).toContain('before <a')
    expect(result).toContain('</a> after')
  })

  it('should link URL in deeply nested content', async () => {
    const value = '<div><section><p><em>See https://deep.com here</em></p></section></div>'
    const result = await transform(value)

    expect(result).toContain('href="https://deep.com"')
  })

  it('should handle URL at start of text node', async () => {
    const value = '<p>https://example.com is a URL</p>'
    const result = await transform(value)

    expect(result).toContain('<a href="https://example.com"')
  })

  it('should handle URL at end of text node', async () => {
    const value = '<p>Visit https://example.com</p>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com"')
  })

  it('should not double-link already linked URL', async () => {
    const value = '<p><a href="https://example.com">https://example.com</a></p>'
    const result = await transform(value)

    expect(result.match(/<a /g)).toHaveLength(1)
  })

  it('should not link protocol-less URL', async () => {
    const value = '<p>Visit example.com for more</p>'
    const result = await transform(value)

    expect(result).not.toContain('<a')
  })

  it('should not link email address', async () => {
    const value = '<p>Contact user@example.com</p>'
    const result = await transform(value)

    expect(result).not.toContain('<a')
  })

  for (const tag of ['pre', 'code', 'kbd', 'samp', 'var']) {
    it(`should not link URL inside ${tag} tag`, async () => {
      const value = `<${tag}>https://example.com</${tag}>`
      const result = await transform(value)

      expect(result).not.toContain('<a')
    })
  }

  it('should not link URL inside nested code within pre', async () => {
    const value = '<pre><code>const url = "https://example.com"</code></pre>'
    const result = await transform(value)

    expect(result).not.toContain('<a')
  })

  it('should not modify html with no URLs', async () => {
    const value = '<p>No links here</p>'
    const result = await transform(value)

    expect(result).toContain('<p>No links here</p>')
  })

  it('should handle whitespace-only text nodes', async () => {
    const value = '<p>   </p>'
    const result = await transform(value)

    expect(result).not.toContain('<a')
  })

  it('should handle empty content', async () => {
    const value = ''
    const result = await transform(value)

    expect(result).not.toContain('<a')
  })
})
