import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { normalizeFootnotes } from './normalizeFootnotes.js'

const sourceContext: TransformContext = { ...baseContext, baseUrl: 'https://example.com/post' }

describeForEachParser('normalizeFootnotes', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [normalizeFootnotes(context)])
  }

  describe('complete footnotes (definition present)', () => {
    it('should relocate kramdown ref and definition targets onto <a name>', async () => {
      const value = html`
        <p>A claim that needs support.<sup id="fnref:1"><a href="#fn:1" class="footnote" rel="footnote" role="doc-noteref">1</a></sup></p>
        <div class="footnotes" role="doc-endnotes">
          <ol>
            <li id="fn:1" role="doc-endnote">
              <p>The supporting note. <a href="#fnref:1" class="reversefootnote" role="doc-backlink">↩</a></p>
            </li>
          </ol>
        </div>
      `
      const expected = html`
        <p>A claim that needs support.<sup id="fnref:1"><a name="fnref:1"></a><a href="#fn:1" class="footnote" rel="footnote" role="doc-noteref">1</a></sup></p>
        <div class="footnotes" role="doc-endnotes">
          <ol>
            <li id="fn:1" role="doc-endnote">
              <a name="fn:1"></a>
              <p>The supporting note. <a href="#fnref:1" class="reversefootnote" role="doc-backlink">↩</a></p>
            </li>
          </ol>
        </div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should set name on the ref anchor for GFM footnotes (id on the <a>, not nested)', async () => {
      const value = html`
        <p>Claim.<sup><a href="#user-content-fn-1" id="user-content-fnref-1" data-footnote-ref aria-describedby="footnote-label">1</a></sup></p>
        <section data-footnotes class="footnotes">
          <h2 class="sr-only" id="footnote-label">Footnotes</h2>
          <ol>
            <li id="user-content-fn-1">
              <p>The note. <a href="#user-content-fnref-1" data-footnote-backref class="data-footnote-backref" aria-label="Back to reference 1">↩</a></p>
            </li>
          </ol>
        </section>
      `
      const expected = html`
        <p>Claim.<sup><a href="#user-content-fn-1" id="user-content-fnref-1" name="user-content-fnref-1" data-footnote-ref aria-describedby="footnote-label">1</a></sup></p>
        <section data-footnotes class="footnotes">
          <h2 class="sr-only" id="footnote-label">Footnotes</h2>
          <ol>
            <li id="user-content-fn-1">
              <a name="user-content-fn-1"></a>
              <p>The note. <a href="#user-content-fnref-1" data-footnote-backref class="data-footnote-backref" aria-label="Back to reference 1">↩</a></p>
            </li>
          </ol>
        </section>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should place the name before a restricted-content target (docutils <table> def)', async () => {
      const value = html`
        <p>Text.<a class="footnote-reference" href="#footnote-1" id="fnref-1">[1]</a></p>
        <table class="docutils footnote" id="footnote-1">
          <tbody>
            <tr>
              <td><a class="fn-backref" href="#fnref-1">[1]</a></td>
              <td>The note.</td>
            </tr>
          </tbody>
        </table>
      `
      const expected = html`
        <p>Text.<a class="footnote-reference" href="#footnote-1" id="fnref-1" name="fnref-1">[1]</a></p>
        <a name="footnote-1"></a>
        <table class="docutils footnote" id="footnote-1">
          <tbody>
            <tr>
              <td><a class="fn-backref" href="#fnref-1">[1]</a></td>
              <td>The note.</td>
            </tr>
          </tbody>
        </table>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should add the name before a restricted target only once when referenced twice', async () => {
      const value = html`
        <p>A<a class="footnote-reference" href="#footnote-1" id="fnref-1">[1]</a> and B<a class="footnote-reference" href="#footnote-1" id="fnref-2">[1]</a></p>
        <table class="docutils footnote" id="footnote-1">
          <tbody>
            <tr><td>The note.</td></tr>
          </tbody>
        </table>
      `
      const expected = html`
        <p>A<a class="footnote-reference" href="#footnote-1" id="fnref-1">[1]</a> and B<a class="footnote-reference" href="#footnote-1" id="fnref-2">[1]</a></p>
        <a name="footnote-1"></a>
        <table class="docutils footnote" id="footnote-1">
          <tbody>
            <tr><td>The note.</td></tr>
          </tbody>
        </table>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should detect a ref by ARIA role even with a non-footnote-shaped fragment', async () => {
      const value = html`
        <p>X<sup><a href="#note-a" role="doc-noteref">1</a></sup></p>
        <li id="note-a">A note.</li>
      `
      const expected = html`
        <p>X<sup><a href="#note-a" role="doc-noteref">1</a></sup></p>
        <li id="note-a"><a name="note-a"></a>A note.</li>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should still relocate when the target already holds an unrelated <a name>', async () => {
      const value = html`
        <p>X<sup><a href="#fn:2" class="footnote">2</a></sup></p>
        <li id="fn:2"><a name="other"></a>A note.</li>
      `
      const expected = html`
        <p>X<sup><a href="#fn:2" class="footnote">2</a></sup></p>
        <li id="fn:2"><a name="fn:2"></a><a name="other"></a>A note.</li>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave Word/GDocs footnotes (already <a name>) unchanged', async () => {
      const value = html`
        <p>Claim.<a href="#_ftn1" name="_ftnref1"><sup>1</sup></a></p>
        <div>
          <p><a href="#_ftnref1" name="_ftn1"><sup>1</sup></a> The note.</p>
        </div>
      `

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('orphan refs (definition truncated out of the body)', () => {
    it('should re-point an orphan ref at the source article', async () => {
      const value = '<p>Claim.<sup><a href="#fn:1" class="footnote">1</a></sup></p>'
      const expected =
        '<p>Claim.<sup><a href="https://example.com/post#fn:1" class="footnote">1</a></sup></p>'

      expect(await transform(value, sourceContext)).toEqualHtml(expected)
    })

    it('should leave an orphan ref untouched when no baseUrl is set', async () => {
      const value = '<p>Claim.<sup><a href="#fn:1" class="footnote">1</a></sup></p>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('non-footnote anchors', () => {
    it('should leave a plain in-page link alone', async () => {
      const value = html`
        <p>See <a href="#section">the section</a>.</p>
        <h2 id="section">Section</h2>
      `

      expect(await transform(value, sourceContext)).toEqualHtml(value)
    })

    it('should leave an off-page footnote-shaped link alone', async () => {
      const value = '<p>X<sup><a href="https://other.com/p#fn1">1</a></sup></p>'

      expect(await transform(value, sourceContext)).toEqualHtml(value)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <p>A claim.<sup id="fnref:1"><a href="#fn:1" class="footnote" role="doc-noteref">1</a></sup></p>
      <div class="footnotes">
        <ol>
          <li id="fn:1">
            <p>The note. <a href="#fnref:1" class="reversefootnote">↩</a></p>
          </li>
        </ol>
      </div>
    `
    const once = await transform(value, sourceContext)
    const twice = await transform(once, sourceContext)

    expect(twice).toBe(once)
  })
})
