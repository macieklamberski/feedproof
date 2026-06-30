import { describe, expect, it } from 'bun:test'
import { parseHtml } from '../../parsers/linkedom.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { linkifyUrls } from './linkifyUrls.js'

describeForEachParser('linkifyUrls', (parseHtml) => {
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
    const expected = html`
      <p>Visit <a href="http://example.com">http://example.com</a> for more</p>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should link URL with path and query', async () => {
    const value = '<p>See https://example.com/path?key=value&other=1#hash for details</p>'
    const expected = html`
      <p>See
        <a
          href="https://example.com/path?key=value&other=1#hash"
        >https://example.com/path?key=value&amp;other=1#hash</a>
        for details</p>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should link multiple URLs in one paragraph', async () => {
    const value = '<p>See https://example.com and https://example.org</p>'
    const expected = html`
      <p>See <a href="https://example.com">https://example.com</a>
        and <a href="https://example.org">https://example.org</a></p>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should link URLs across multiple paragraphs', async () => {
    const value = html`
      <p>See https://example.com</p>
      <p>And https://example.org</p>
    `
    const expected = html`
      <p>See <a href="https://example.com">https://example.com</a></p>
      <p>And <a href="https://example.org">https://example.org</a></p>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should link bare URL while preserving existing links', async () => {
    const value = '<p><a href="https://example.com">linked</a> and https://example.org</p>'
    const expected = html`
      <p>
        <a href="https://example.com">linked</a>
        and <a href="https://example.org">https://example.org</a>
      </p>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should preserve surrounding text when linkifying', async () => {
    const value = '<p>before https://example.com after</p>'
    const result = await transform(value)

    expect(result).toContain('before <a')
    expect(result).toContain('</a> after')
  })

  it('should link URL in deeply nested content', async () => {
    const value = '<div><section><p><em>See https://example.com here</em></p></section></div>'
    const expected = html`
      <div>
        <section>
          <p><em>See <a href="https://example.com">https://example.com</a> here</em></p>
        </section>
      </div>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should handle URL at start of text node', async () => {
    const value = '<p>https://example.com is a URL</p>'
    const expected = '<p><a href="https://example.com">https://example.com</a> is a URL</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should handle URL at end of text node', async () => {
    const value = '<p>Visit https://example.com</p>'
    const expected = '<p>Visit <a href="https://example.com">https://example.com</a></p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not double-link already linked URL', async () => {
    const value = '<p><a href="https://example.com">https://example.com</a></p>'
    const result = await transform(value)

    expect(result.match(/<a /g)).toHaveLength(1)
  })

  it('should not link protocol-less URL', async () => {
    const value = '<p>Visit example.com for more</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not link email address', async () => {
    const value = '<p>Contact user@example.com</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  const unlinkableTags: Array<string> = ['pre', 'code', 'kbd', 'samp', 'var', 'script']

  it.each(unlinkableTags)('should not link URL inside %s tag', async (tag) => {
    const value = `<${tag}>https://example.com</${tag}>`

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not link URL inside style tag', async () => {
    // Valid CSS (a comment) so jsdom's stylesheet parser stays quiet.
    const value = '<style>/*\nhttps://example.com\n*/</style>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not link URL inside nested code within pre', async () => {
    const value = '<pre><code>const url = "https://example.com"</code></pre>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not modify html with no URLs', async () => {
    const value = '<p>No links here</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should handle whitespace-only text nodes', async () => {
    const value = '<p>   </p>'

    expect(await transform(value)).toBe(value)
  })

  it('should handle empty content', async () => {
    const value = ''

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should be idempotent', async () => {
    const value = '<p>Visit https://example.com for more</p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})

// linkedom only: jsdom's serializer is itself superlinear in nesting depth, so it
// can't round-trip a document this deep regardless of the transform.
describe('linkifyUrls with deep nesting', () => {
  it('should not overflow the stack on a deeply nested document', async () => {
    const value = `${'<div>'.repeat(40000)}visit https://example.com${'</div>'.repeat(40000)}`
    const result = await applyDomTransforms(parseHtml(value), [linkifyUrls(baseContext)])

    expect(result).toContain('<a href="https://example.com">')
  })
})
