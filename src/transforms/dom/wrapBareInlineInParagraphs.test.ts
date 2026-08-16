import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
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
      const value = html`
        <div>text with <a href="https://example.com">a link</a> and <em>emphasis</em>
        </div>
      `
      const expected = html`
        <div>
          <p>text with <a href="https://example.com">a link</a> and <em>emphasis</em>
          </p>
        </div>
      `

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

  describe('aligned li / td / blockquote / aside', () => {
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

    it('should leave a single-run aside untouched', async () => {
      const value = '<aside>Editor note</aside>'

      expect(await transform(value)).toBe(value)
    })

    it('should wrap stray inline text beside a block inside an aside', async () => {
      const value = '<aside>intro<p>x</p></aside>'
      const expected = '<aside><p>intro</p><p>x</p></aside>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('figures', () => {
    it('should wrap a caption div inside a figure', async () => {
      const value = '<figure><img src="x.jpg"><div>A long caption text</div></figure>'
      const expected = '<figure><img src="x.jpg"><div><p>A long caption text</p></div></figure>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap bare text after an image', async () => {
      const value = '<figure><img src="x.jpg">Photo: Jane Doe</figure>'
      const expected = '<figure><img src="x.jpg"><p>Photo: Jane Doe</p></figure>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap bare text between an image and a figcaption', async () => {
      const value = '<figure><img src="x.jpg">Description<figcaption>Credit</figcaption></figure>'
      const expected = html`
        <figure>
          <img src="x.jpg">
          <p>Description</p>
          <figcaption>Credit</figcaption>
        </figure>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should keep a linked image out of the wrapped paragraph', async () => {
      const value = '<figure><a href="https://example.com"><img src="x.jpg"></a>Caption</figure>'
      const expected = html`
        <figure>
          <a href="https://example.com">
            <img src="x.jpg">
          </a>
          <p>Caption</p>
        </figure>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should leave a media-only figure untouched', async () => {
      const value = '<figure><img src="x.jpg"></figure>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave a quote figure untouched', async () => {
      const value = '<figure><blockquote>quote</blockquote><figcaption>Author</figcaption></figure>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('media boundaries', () => {
    it('should split a leading image from the following text', async () => {
      const value = '<img src="x.jpg">In this monthly issue, we take a closer look.'
      const expected = html`
        <img src="x.jpg">
        <p>In this monthly issue, we take a closer look.</p>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should split a trailing image from the preceding text', async () => {
      const value = '<div>Some intro text<img src="x.jpg"></div>'
      const expected = '<div><p>Some intro text</p><img src="x.jpg"></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should keep an inline image surrounded by text inside the paragraph', async () => {
      const value = '<div>before <img src="smiley.gif"> after</div>'
      const expected = '<div><p>before <img src="smiley.gif"> after</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should keep a comment at the run edge out of the wrapped paragraph', async () => {
      const value = '<div><!-- note -->text<img src="x.jpg"></div>'
      const expected = '<div><!-- note --><p>text</p><img src="x.jpg"></div>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('skipped contexts', () => {
    it('should not wrap inside figcaption', async () => {
      const value = '<figure><figcaption><div>caption</div></figcaption></figure>'

      expect(await transform(value)).toBe(value)
    })

    it('should not wrap a div inside an anchor', async () => {
      const value = '<div><a href="https://example.com"><div>link</div></a></div>'
      const expected = '<div><p><a href="https://example.com"><div>link</div></a></p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should not wrap inside pre or code', async () => {
      expect(await transform('<pre><div>code</div></pre>')).toBe('<pre><div>code</div></pre>')
      expect(await transform('<pre><code><div>x</div></code></pre>')).toBe(
        '<pre><code><div>x</div></code></pre>',
      )
    })

    it('should not wrap inside a heading', async () => {
      const value = '<h2><div>subtitle</div></h2>'

      expect(await transform(value)).toBe(value)
    })

    it('should not wrap inside a picture', async () => {
      const value = '<ul><li><picture><div>fallback text</div></picture></li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should not wrap inside a table caption', async () => {
      const value = html`
        <table>
          <caption>
            <div>Quarterly results</div>
          </caption>
          <tbody>
            <tr>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should not wrap inside a summary', async () => {
      const value = '<details><summary><div>More info</div></summary><p>Details</p></details>'

      expect(await transform(value)).toBe(value)
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

    it('should handle empty input', async () => {
      expect(await transform('')).toBe('')
    })

    it('should be idempotent', async () => {
      const value = '<div>intro<p>para</p>outro</div>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })

    it('should be idempotent for figures', async () => {
      const value = '<figure><img src="x.jpg">Description<figcaption>Credit</figcaption></figure>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })
})
