import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { decodeDoubleEncodedTags } from './decodeDoubleEncodedTags.js'

describeForEachParser('decodeDoubleEncodedTags', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [decodeDoubleEncodedTags(context)])
  }

  it('should decode entity-encoded link tags mixed with real HTML', async () => {
    const value = '<p>Build &lt;a href="/products" target="_blank"&gt;eight products&lt;/a&gt;.</p>'
    const expected = '<p>Build <a href="/products" target="_blank">eight products</a>.</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should decode entity-encoded div tags', async () => {
    const value = '<p>&lt;div class="mx-auto max-w-2xl"&gt;&lt;/div&gt;</p>'
    const expected = '<p><div class="mx-auto max-w-2xl"></div></p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should decode entity-encoded bold tags', async () => {
    const value = '<p>&lt;b&gt;important&lt;/b&gt;</p>'
    const expected = '<p><b>important</b></p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should decode entity-encoded heading tags', async () => {
    const value = '<p>&lt;h3&gt;Title&lt;/h3&gt;</p>'
    const expected = '<p><h3>Title</h3></p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should not modify content with only real HTML tags', async () => {
    const value = '<p>Build <a href="/products">eight products</a>.</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should not modify content with only entity-encoded tags (no real HTML)', async () => {
    const value = '&lt;p&gt;Hello world&lt;/p&gt;'

    expect(await transform(value)).toBe(value)
  })

  it('should not modify plain text without any tags', async () => {
    const value = 'Just plain text with no tags'

    expect(await transform(value)).toBe(value)
  })

  it('should handle multiple encoded tags in one line', async () => {
    const value =
      '<li>Visit &lt;a href="https://youtube.com"&gt;YouTube&lt;/a&gt;, &lt;a href="https://x.com"&gt;X&lt;/a&gt;.</li>'
    const expected =
      '<li>Visit <a href="https://youtube.com">YouTube</a>, <a href="https://x.com">X</a>.</li>'

    expect(await transform(value)).toBe(expected)
  })

  it('should handle self-closing encoded tags', async () => {
    const value = '<p>&lt;br/&gt;</p>'
    const expected = '<p><br></p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should handle empty string', async () => {
    expect(await transform('')).toBe('')
  })

  it('should not decode entity-encoded tags inside code elements', async () => {
    const value = '<p>Image is requested by <code>&lt;img&gt;</code> tag.</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should not decode entity-encoded tags inside pre elements', async () => {
    const value = '<pre>&lt;div class="wrapper"&gt;&lt;/div&gt;</pre>'

    expect(await transform(value)).toBe(value)
  })

  it('should not decode entity-encoded tags inside pre>code elements', async () => {
    const value = '<pre><code>&lt;img src="photo.jpg"&gt;</code></pre>'

    expect(await transform(value)).toBe(value)
  })

  it('should decode tags outside code but preserve tags inside code', async () => {
    const value = '<p>&lt;b&gt;bold&lt;/b&gt;</p><code>&lt;img&gt;</code>'
    const expected = '<p><b>bold</b></p><code>&lt;img&gt;</code>'

    expect(await transform(value)).toBe(expected)
  })

  it('should handle multiple code blocks with encoded tags between them', async () => {
    const value = '<code>&lt;a&gt;</code><p>&lt;b&gt;text&lt;/b&gt;</p><code>&lt;div&gt;</code>'
    const expected = '<code>&lt;a&gt;</code><p><b>text</b></p><code>&lt;div&gt;</code>'

    expect(await transform(value)).toBe(expected)
  })

  it('should not decode entity-encoded tags inside <script>', async () => {
    // <script> is a raw-text element — its body is one text node, not parsed
    // elements. The element-aware walk skips it without explicit guards.
    const value = '<p>x</p><script>htmlString.replace(/&lt;/g, "<")</script>'

    expect(await transform(value)).toBe(value)
  })

  it('should not decode entity-encoded tags inside <style>', async () => {
    const value = '<p>x</p><style>.x:before { content: "&lt;br&gt;" }</style>'

    expect(await transform(value)).toBe(value)
  })

  it('should not decode entity-encoded tags inside <textarea>', async () => {
    const value = '<p>x</p><textarea>&lt;tag&gt;example to copy&lt;/tag&gt;</textarea>'

    expect(await transform(value)).toBe(value)
  })

  it('should not decode entity-encoded tags inside <noscript>', async () => {
    const value = '<p>x</p><noscript>&lt;b&gt;fallback&lt;/b&gt;</noscript>'

    expect(await transform(value)).toBe(value)
  })

  it('should not decode entity-encoded tags inside HTML comments', async () => {
    // Comments are COMMENT_NODE, not TEXT_NODE. The text-node walk ignores
    // them.
    const value = '<!-- &lt;div&gt; --><p>x &lt;b&gt;bold&lt;/b&gt;</p>'
    const expected = '<!-- &lt;div&gt; --><p>x <b>bold</b></p>'

    expect(await transform(value)).toBe(expected)
  })
})
