import { describe, expect, it } from 'bun:test'
import type { TransformContext } from '../../types.js'
import { decodeDoubleEncodedTags } from './decodeDoubleEncodedTags.js'

const context: TransformContext = {}

describe('decodeDoubleEncodedTags', () => {
  const decode = decodeDoubleEncodedTags(context)

  it('should decode entity-encoded link tags mixed with real HTML', () => {
    const result = decode(
      '<p>Build &lt;a href="/products" target="_blank"&gt;eight products&lt;/a&gt;.</p>',
    )

    expect(result).toContain('<a href="/products" target="_blank">eight products</a>')
  })

  it('should decode entity-encoded div tags', () => {
    const result = decode('<p>&lt;div class="mx-auto max-w-2xl"&gt;&lt;/div&gt;</p>')

    expect(result).toContain('<div class="mx-auto max-w-2xl"></div>')
  })

  it('should decode entity-encoded bold and heading tags', () => {
    const result = decode('<p>&lt;b&gt;important&lt;/b&gt;</p>')

    expect(result).toContain('<b>important</b>')
  })

  it('should decode entity-encoded heading tags', () => {
    const result = decode('<p>&lt;h3&gt;Title&lt;/h3&gt;</p>')

    expect(result).toContain('<h3>Title</h3>')
  })

  it('should not modify content with only real HTML tags', () => {
    const html = '<p>Build <a href="/products">eight products</a>.</p>'

    expect(decode(html)).toBe(html)
  })

  it('should not modify content with only entity-encoded tags (no real HTML)', () => {
    const html = '&lt;p&gt;Hello world&lt;/p&gt;'

    expect(decode(html)).toBe(html)
  })

  it('should not modify plain text without any tags', () => {
    const html = 'Just plain text with no tags'

    expect(decode(html)).toBe(html)
  })

  it('should handle multiple encoded tags in one line', () => {
    const result = decode(
      '<li>Visit &lt;a href="https://youtube.com"&gt;YouTube&lt;/a&gt;, &lt;a href="https://x.com"&gt;X&lt;/a&gt;.</li>',
    )

    expect(result).toContain('<a href="https://youtube.com">YouTube</a>')
    expect(result).toContain('<a href="https://x.com">X</a>')
  })

  it('should handle self-closing encoded tags', () => {
    const result = decode('<p>&lt;br/&gt;</p>')

    expect(result).toContain('<br/>')
  })

  it('should handle empty string', () => {
    expect(decode('')).toBe('')
  })

  it('should not decode entity-encoded tags inside code elements', () => {
    const value = '<p>Image is requested by <code>&lt;img&gt;</code> tag.</p>'

    expect(decode(value)).toBe(value)
  })

  it('should not decode entity-encoded tags inside pre elements', () => {
    const value = '<pre>&lt;div class="wrapper"&gt;&lt;/div&gt;</pre>'

    expect(decode(value)).toBe(value)
  })

  it('should not decode entity-encoded tags inside pre>code elements', () => {
    const value = '<pre><code>&lt;img src="photo.jpg"&gt;</code></pre>'

    expect(decode(value)).toBe(value)
  })

  it('should decode tags outside code but preserve tags inside code', () => {
    const value = '<p>&lt;b&gt;bold&lt;/b&gt;</p><code>&lt;img&gt;</code>'
    const expected = '<p><b>bold</b></p><code>&lt;img&gt;</code>'

    expect(decode(value)).toBe(expected)
  })

  it('should handle multiple code blocks with encoded tags between them', () => {
    const value = '<code>&lt;a&gt;</code><p>&lt;b&gt;text&lt;/b&gt;</p><code>&lt;div&gt;</code>'
    const expected = '<code>&lt;a&gt;</code><p><b>text</b></p><code>&lt;div&gt;</code>'

    expect(decode(value)).toBe(expected)
  })
})
