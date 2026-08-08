import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { decodeDoubleEncodedEntities } from './decodeDoubleEncodedEntities.js'
import { decodeDoubleEncodedTags } from './decodeDoubleEncodedTags.js'

describeForEachParser('decodeDoubleEncodedEntities', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [decodeDoubleEncodedEntities(context)])
  }

  describe('decodes doubled entities', () => {
    it('should decode a doubled ampersand', async () => {
      const value = '<p>Tom &amp;amp; Jerry</p>'

      expect(await transform(value)).toEqualHtml('<p>Tom &amp; Jerry</p>')
    })

    it('should decode doubled angle-bracket entities into escaped text', async () => {
      const value = '<p>&amp;lt;script&amp;gt;</p>'

      expect(await transform(value)).toEqualHtml('<p>&lt;script&gt;</p>')
    })

    it('should decode a doubled quote entity', async () => {
      const value = '<p>say &amp;quot;hi&amp;quot;</p>'

      expect(await transform(value)).toEqualHtml('<p>say "hi"</p>')
    })

    it('should decode a doubled apostrophe entity', async () => {
      const value = '<p>it&amp;apos;s</p>'

      expect(await transform(value)).toEqualHtml("<p>it's</p>")
    })

    it('should decode a doubled hex numeric reference', async () => {
      const value = '<p>dash &amp;#x2014; here</p>'

      expect(await transform(value)).toEqualHtml('<p>dash — here</p>')
    })

    it('should decode a doubled decimal numeric reference', async () => {
      const value = '<p>dash &amp;#8212; here</p>'

      expect(await transform(value)).toEqualHtml('<p>dash — here</p>')
    })

    it('should decode entity names case-insensitively', async () => {
      const value = '<p>&amp;AMP;</p>'

      expect(await transform(value)).toEqualHtml('<p>&amp;</p>')
    })

    it('should decode multiple doubled entities in one text node', async () => {
      const value = '<p>Tom &amp;amp; Jerry &amp;lt;3 &amp;quot;cartoon&amp;quot;</p>'

      expect(await transform(value)).toEqualHtml('<p>Tom &amp; Jerry &lt;3 "cartoon"</p>')
    })

    it('should decode doubled entities in a text-only body', async () => {
      const value = 'Tom &amp;amp; Jerry'

      expect(await transform(value)).toEqualHtml('Tom &amp; Jerry')
    })

    it('should peel only one layer of a triple-encoded entity', async () => {
      const value = '<p>&amp;amp;amp;</p>'

      expect(await transform(value)).toEqualHtml('<p>&amp;amp;</p>')
    })
  })

  describe('leaves single-encoded and unrelated text alone', () => {
    it('should leave a single-encoded ampersand alone', async () => {
      const value = '<p>Tom &amp; Jerry</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave single-encoded angle brackets alone', async () => {
      const value = '<p>5 &lt; 10</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an unknown entity name alone', async () => {
      const value = '<p>&amp;unknownEntity; rest</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave text without entities alone', async () => {
      const value = '<p>plain text with no entities</p>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('never materializes elements', () => {
    it('should keep an escaped tag as text while decoding the doubled entity beside it', async () => {
      const value = '<p>Build &lt;a href="/products"&gt; pages &amp;amp; posts</p>'

      expect(await transform(value)).toEqualHtml(
        '<p>Build &lt;a href="/products"&gt; pages &amp; posts</p>',
      )
    })
  })

  describe('respects opaque elements', () => {
    it('should not decode inside a code element', async () => {
      const value = '<p>example: <code>&amp;amp;</code></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode inside a pre element', async () => {
      const value = '<pre>Tom &amp;amp; Jerry</pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode inside a pre>code element', async () => {
      const value = '<pre><code>Tom &amp;amp; Jerry</code></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not decode inside a textarea element', async () => {
      const value = '<p>x</p><textarea>&amp;amp;</textarea>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should decode outside a code element but not inside it', async () => {
      const value = '<p>Tom &amp;amp; Jerry</p><code>&amp;amp;</code>'

      expect(await transform(value)).toEqualHtml('<p>Tom &amp; Jerry</p><code>&amp;amp;</code>')
    })
  })

  describe('composes with decodeDoubleEncodedTags', () => {
    const pipeline = (html: string) => {
      return applyDomTransforms(parseHtml(html), [
        decodeDoubleEncodedEntities(baseContext),
        decodeDoubleEncodedTags(baseContext),
      ])
    }

    it('should decode a fragment whose tags and entities are both doubled', async () => {
      // The entity peel exposes the literal `<` the tag pass gates on; in the reverse order
      // the tag pass would have skipped the fragment and it would stay visible escaped markup.
      const value = '&amp;lt;p&amp;gt;Tom &amp;amp;amp; Jerry&amp;lt;/p&amp;gt;'

      expect(await pipeline(value)).toEqualHtml('<p>Tom &amp; Jerry</p>')
    })

    it('should leave a whole-escaped fragment to the tag pass alone', async () => {
      const value = '&lt;p&gt;Tom &amp; Jerry&lt;/p&gt;'

      expect(await pipeline(value)).toEqualHtml('<p>Tom &amp; Jerry</p>')
    })
  })

  it('should handle an empty string', async () => {
    expect(await transform('')).toBe('')
  })

  it('should be idempotent', async () => {
    const value = '<p>Tom &amp;amp; Jerry &amp;lt;3</p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
