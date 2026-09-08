import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { decodeDoubleEncodedTags } from './decodeDoubleEncodedTags.js'

describeForEachParser('decodeDoubleEncodedTags', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [decodeDoubleEncodedTags(context)])
  }

  describe('decodes whole escaped fragments', () => {
    it('should decode an escaped element that is a real block’s whole content', async () => {
      const value = '<p>&lt;b&gt;important&lt;/b&gt;</p>'

      expect(await transform(value)).toEqualHtml('<p><b>important</b></p>')
    })

    it('should decode a fully escaped body', async () => {
      const value = '&lt;p&gt;Hello world&lt;/p&gt;'

      expect(await transform(value)).toEqualHtml('<p>Hello world</p>')
    })

    it('should decode multiple escaped block elements', async () => {
      const value = '&lt;p&gt;One.&lt;/p&gt;&lt;p&gt;Two.&lt;/p&gt;'

      expect(await transform(value)).toEqualHtml('<p>One.</p><p>Two.</p>')
    })

    it('should decode an escaped link with attributes and text', async () => {
      const value = '&lt;p&gt;&lt;a href="https://example.com"&gt;link&lt;/a&gt;&lt;/p&gt;'

      expect(await transform(value)).toEqualHtml('<p><a href="https://example.com">link</a></p>')
    })

    it('should decode an escaped fragment containing SVG markup', async () => {
      const value =
        '&lt;p&gt;icon &lt;svg viewBox="0 0 16 16"&gt;&lt;path d="M0 0h16v16H0z"&gt;&lt;/path&gt;&lt;/svg&gt;&lt;/p&gt;'

      expect(await transform(value)).toEqualHtml(
        '<p>icon <svg viewBox="0 0 16 16"><path d="M0 0h16v16H0z"></path></svg></p>',
      )
    })

    it('should decode an escaped fragment containing a custom element', async () => {
      const value =
        '&lt;p&gt;&lt;lite-youtube videoid="dQw4w9WgXcQ"&gt;&lt;/lite-youtube&gt;&lt;/p&gt;'

      expect(await transform(value)).toEqualHtml(
        '<p><lite-youtube videoid="dQw4w9WgXcQ"></lite-youtube></p>',
      )
    })

    it('should decode an escaped fragment containing an obsolete element', async () => {
      const value = '&lt;center&gt;&lt;font color="red"&gt;hello&lt;/font&gt;&lt;/center&gt;'

      expect(await transform(value)).toEqualHtml('<center><font color="red">hello</font></center>')
    })
  })

  describe('strips an escaped paragraph pair around real elements', () => {
    // The generator escaped the paragraph tags and left the links inside as markup, so the
    // tags reach the reader as literal text on either side of the links.
    it('should drop the escaped tags and keep the elements between them', async () => {
      const value =
        '<p>&lt;p&gt;The post <a href="https://example.com/news/burrito">Burrito news</a> first appeared on <a href="https://example.com">Example</a>.&lt;/p&gt;</p>'
      const expected =
        '<p>The post <a href="https://example.com/news/burrito">Burrito news</a> first appeared on <a href="https://example.com">Example</a>.</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave an escaped pair that is not a paragraph', async () => {
      const value = '<p>&lt;b&gt;The post <a href="https://example.com">Example</a>&lt;/b&gt;</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an escaped paragraph tag with no closing pair', async () => {
      const value = '<p>&lt;p&gt;The post <a href="https://example.com">Example</a> ends here.</p>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('leaves ambiguous content as text', () => {
    it('should not decode an escaped tag embedded in prose', async () => {
      const value = '<p>Build &lt;a href="/products"&gt;eight products&lt;/a&gt; today.</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode a tag mentioned in a heading', async () => {
      const value = '<h2>Use &lt;video&gt;</h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode a backtick-wrapped tag', async () => {
      const value = '<p>example: `&lt;img src=picture.png&gt;`</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode a lone self-closing tag', async () => {
      const value = '<p>&lt;br/&gt;</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode a stray closing tag', async () => {
      const value = '<div>&lt;/pre&gt;</div>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode non-HTML markup', async () => {
      const value =
        '&lt;dependency&gt;&lt;groupId&gt;org.example&lt;/groupId&gt;&lt;/dependency&gt;'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode an unknown tag name', async () => {
      const value = '&lt;widget&gt;content&lt;/widget&gt;'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode a fragment containing command placeholders', async () => {
      const value = '&lt;p&gt;Run ssh &lt;user&gt;@&lt;host&gt; to connect.&lt;/p&gt;'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode a fragment containing code generics', async () => {
      const value = '&lt;p&gt;Store items in Vec&lt;T&gt; for speed.&lt;/p&gt;'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode an angle-bracketed url', async () => {
      const value = '<p>see &lt;https://example.com/path&gt; for more</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not modify plain text without tags', async () => {
      const value = 'Just plain text with no tags'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not modify content with only real HTML tags', async () => {
      const value = '<p>Build <a href="/products">eight products</a>.</p>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('respects opaque elements', () => {
    it('should not decode an escaped fragment inside a real code element', async () => {
      const value = '<code>&lt;p&gt;example&lt;/p&gt;</code>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode an escaped fragment inside a real pre element', async () => {
      const value = '<pre>&lt;div&gt;&lt;span&gt;x&lt;/span&gt;&lt;/div&gt;</pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should decode outside a code element but not inside it', async () => {
      const value = '<p>&lt;b&gt;bold&lt;/b&gt;</p><code>&lt;b&gt;code&lt;/b&gt;</code>'

      expect(await transform(value)).toEqualHtml(
        '<p><b>bold</b></p><code>&lt;b&gt;code&lt;/b&gt;</code>',
      )
    })
  })

  describe('decodes code blocks but keeps their contents as text', () => {
    it('should decode an escaped pre>code wrapper and re-escape its contents', async () => {
      const value =
        '&lt;pre&gt;&lt;code&gt;&lt;div class="x"&gt;hi&lt;/div&gt;&lt;/code&gt;&lt;/pre&gt;'

      expect(await transform(value)).toEqualHtml(
        '<pre><code>&lt;div class="x"&gt;hi&lt;/div&gt;</code></pre>',
      )
    })

    it('should re-escape the contents of an escaped pre without a code child', async () => {
      const value = '&lt;pre&gt;&lt;span&gt;x&lt;/span&gt;&lt;/pre&gt;'

      expect(await transform(value)).toEqualHtml('<pre>&lt;span&gt;x&lt;/span&gt;</pre>')
    })

    it('should re-escape the contents of inline code in a fragment', async () => {
      const value = '&lt;p&gt;use &lt;code&gt;&lt;b&gt;x&lt;/b&gt;&lt;/code&gt;&lt;/p&gt;'

      expect(await transform(value)).toEqualHtml('<p>use <code>&lt;b&gt;x&lt;/b&gt;</code></p>')
    })

    it('should be idempotent for a code block', async () => {
      const value = '&lt;pre&gt;&lt;code&gt;&lt;div&gt;hi&lt;/div&gt;&lt;/code&gt;&lt;/pre&gt;'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })
  })

  it('should handle an empty string', async () => {
    expect(await transform('')).toEqualHtml('')
  })

  it('should be idempotent', async () => {
    const value = '&lt;p&gt;One.&lt;/p&gt;&lt;p&gt;Two.&lt;/p&gt;'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
