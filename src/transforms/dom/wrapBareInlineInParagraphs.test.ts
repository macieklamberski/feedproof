import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { wrapBareInlineInParagraphs } from './wrapBareInlineInParagraphs.js'

describeForEachParser('wrapBareInlineInParagraphs', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [wrapBareInlineInParagraphs(context)])
  }

  describe('dissolving wrappers', () => {
    it('should wrap a leaf inline div in a paragraph', async () => {
      const value = '<div>text</div>'
      const expected = '<div><p>text</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve inline formatting inside the paragraph', async () => {
      const value =
        '<div>text with <a href="https://example.com">a link</a> and <em>emphasis</em></div>'
      const expected =
        '<div><p>text with <a href="https://example.com">a link</a> and <em>emphasis</em></p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should split a mixed inline/block wrapper into paragraphs around the block', async () => {
      const value = '<div>intro<p>para</p>outro</div>'
      const expected = '<div><p>intro</p><p>para</p><p>outro</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap inline runs around a list and pass the list through', async () => {
      const value = '<div>text<ul><li>x</li></ul>more</div>'
      const expected = '<div><p>text</p><ul><li>x</li></ul><p>more</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should keep a single br inside the wrapped paragraph', async () => {
      const value = '<div>text<br></div>'
      const expected = '<div><p>text<br></p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap inside section, article, header, footer, main', async () => {
      expect(await transform('<section>text</section>')).toBe('<section><p>text</p></section>')
      expect(await transform('<article>text</article>')).toBe('<article><p>text</p></article>')
      expect(await transform('<header>text</header>')).toBe('<header><p>text</p></header>')
      expect(await transform('<footer>text</footer>')).toBe('<footer><p>text</p></footer>')
      expect(await transform('<main>text</main>')).toBe('<main><p>text</p></main>')
    })

    it('should wrap top-level inline content in body', async () => {
      const value = '<a href="https://example.com">link</a>'
      const expected = '<p><a href="https://example.com">link</a></p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('aligned li / td / blockquote', () => {
    it('should leave a plain list item untouched', async () => {
      const value = '<ul><li>x</li><li>y</li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave a plain table cell untouched', async () => {
      const value = '<table><tbody><tr><td>cell</td></tr></tbody></table>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave a plain blockquote untouched', async () => {
      const value = '<blockquote>quote</blockquote>'

      expect(await transform(value)).toBe(value)
    })

    it('should wrap a div-wrapped list item', async () => {
      const value = '<ul><li><div>item</div></li></ul>'
      const expected = '<ul><li><div><p>item</p></div></li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap stray inline text beside a block inside a list item', async () => {
      const value = '<ul><li>intro<p>x</p></li></ul>'
      const expected = '<ul><li><p>intro</p><p>x</p></li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap stray inline text beside a block inside a table cell', async () => {
      const value = '<table><tbody><tr><td>a<p>x</p></td></tr></tbody></table>'
      const expected = '<table><tbody><tr><td><p>a</p><p>x</p></td></tr></tbody></table>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap div paragraphs inside a blockquote', async () => {
      const value = '<blockquote><div>q1</div><div>q2</div></blockquote>'
      const expected = '<blockquote><div><p>q1</p></div><div><p>q2</p></div></blockquote>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('skipped contexts', () => {
    it('should not wrap inside figure', async () => {
      const value = '<figure><div>caption</div></figure>'

      expect(await transform(value)).toBe(value)
    })

    it('should not wrap inside figcaption', async () => {
      const value = '<figure><figcaption><div>caption</div></figcaption></figure>'

      expect(await transform(value)).toBe(value)
    })

    it('should not wrap a div inside an anchor', async () => {
      const value = '<figure><a href="https://example.com"><div>link</div></a></figure>'

      expect(await transform(value)).toBe(value)
    })

    it('should not wrap inside pre or code', async () => {
      expect(await transform('<pre><div>code</div></pre>')).toBe('<pre><div>code</div></pre>')
      expect(await transform('<pre><code><div>x</div></code></pre>')).toBe(
        '<pre><code><div>x</div></code></pre>',
      )
    })
  })

  describe('edge cases', () => {
    it('should leave a media-only wrapper bare', async () => {
      const value = '<div><img src="x.jpg"></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should not create an empty paragraph from a whitespace-only run', async () => {
      const value = '<div>   </div>'

      expect(await transform(value)).toBe(value)
    })

    it('should not create an empty paragraph from a br-only run', async () => {
      const value = '<div><br></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave an already-paragraphed wrapper untouched', async () => {
      const value = '<div><p>text</p></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value = '<div>intro<p>para</p>outro</div>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })
})
