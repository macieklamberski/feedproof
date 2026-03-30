import { describe, expect, it } from 'bun:test'

import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { linkifyUrls } from './linkifyUrls.js'

const context: TransformContext = {}

describe('linkifyUrls', () => {
  const linkify = (html: string) => {
    return transformHtml(html, linkifyUrls(context))
  }

  it('should link bare https URL', () => {
    const result = linkify('<p>Visit https://example.com for more</p>')

    expect(result).toContain('<a href="https://example.com"')
    expect(result).toContain('https://example.com</a>')
  })

  it('should link bare http URL', () => {
    expect(linkify('<p>Visit http://example.com for more</p>')).toContain(
      '<a href="http://example.com"',
    )
  })

  it('should link URL with path and query', () => {
    expect(
      linkify('<p>See https://example.com/path?key=value&other=1#hash for details</p>'),
    ).toContain('href="https://example.com/path?key=value&other=1#hash"')
  })

  it('should link multiple URLs in one paragraph', () => {
    const result = linkify('<p>See https://one.com and https://two.com</p>')

    expect(result.match(/<a /g)).toHaveLength(2)
    expect(result).toContain('href="https://one.com"')
    expect(result).toContain('href="https://two.com"')
  })

  it('should link URLs across multiple paragraphs', () => {
    const result = linkify('<p>See https://one.com</p><p>And https://two.com</p>')

    expect(result.match(/<a /g)).toHaveLength(2)
    expect(result).toContain('href="https://one.com"')
    expect(result).toContain('href="https://two.com"')
  })

  it('should link bare URL while preserving existing links', () => {
    const result = linkify('<p><a href="https://linked.com">linked</a> and https://bare.com</p>')

    expect(result.match(/<a /g)).toHaveLength(2)
    expect(result).toContain('href="https://linked.com"')
    expect(result).toContain('href="https://bare.com"')
  })

  it('should preserve surrounding text when linkifying', () => {
    const result = linkify('<p>before https://example.com after</p>')

    expect(result).toContain('before <a')
    expect(result).toContain('</a> after')
  })

  it('should link URL in deeply nested content', () => {
    expect(
      linkify('<div><section><p><em>See https://deep.com here</em></p></section></div>'),
    ).toContain('href="https://deep.com"')
  })

  it('should handle URL at start of text node', () => {
    expect(linkify('<p>https://example.com is a URL</p>')).toContain(
      '<a href="https://example.com"',
    )
  })

  it('should handle URL at end of text node', () => {
    expect(linkify('<p>Visit https://example.com</p>')).toContain('href="https://example.com"')
  })

  it('should not double-link already linked URL', () => {
    expect(
      linkify('<p><a href="https://example.com">https://example.com</a></p>').match(/<a /g),
    ).toHaveLength(1)
  })

  it('should not link protocol-less URL', () => {
    expect(linkify('<p>Visit example.com for more</p>')).not.toContain('<a')
  })

  it('should not link email address', () => {
    expect(linkify('<p>Contact user@example.com</p>')).not.toContain('<a')
  })

  for (const tag of ['pre', 'code', 'kbd', 'samp', 'var']) {
    it(`should not link URL inside ${tag} tag`, () => {
      expect(linkify(`<${tag}>https://example.com</${tag}>`)).not.toContain('<a')
    })
  }

  it('should not link URL inside nested code within pre', () => {
    expect(linkify('<pre><code>const url = "https://example.com"</code></pre>')).not.toContain('<a')
  })

  it('should not modify html with no URLs', () => {
    expect(linkify('<p>No links here</p>')).toContain('<p>No links here</p>')
  })

  it('should handle whitespace-only text nodes', () => {
    expect(linkify('<p>   </p>')).not.toContain('<a')
  })

  it('should handle empty content', () => {
    expect(linkify('')).not.toContain('<a')
  })
})
