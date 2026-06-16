import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { linkOrphanFootnotes } from './linkOrphanFootnotes.js'

const sourceContext: TransformContext = { ...baseContext, baseUrl: 'https://example.com/post' }

describeForEachParser('linkOrphanFootnotes', (parseHtml) => {
  const transform = (html: string, context: TransformContext = sourceContext) => {
    return applyDomTransforms(parseHtml(html), [linkOrphanFootnotes(context)])
  }

  describe('orphan references (definition missing)', () => {
    it('should re-point an orphan footnote ref at the source article', async () => {
      const value = '<p>Claim.<sup><a href="#fn1">1</a></sup></p>'
      const expected = '<p>Claim.<sup><a href="https://example.com/post#fn1">1</a></sup></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should re-point a GFM orphan ref by its fragment shape', async () => {
      const value = '<p>Claim.<a class="footnote" href="#user-content-fn-1">1</a></p>'
      const expected =
        '<p>Claim.<a class="footnote" href="https://example.com/post#user-content-fn-1">1</a></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave an orphan ref untouched when no baseUrl is set', async () => {
      const value = '<p>Claim.<sup><a href="#fn1">1</a></sup></p>'

      expect(await transform(value, baseContext)).toEqualHtml(value)
    })

    it('should leave an orphan ref untouched when the fragment does not resolve', async () => {
      const value = '<p>Claim.<sup><a href="#fn1">1</a></sup></p>'
      const context: TransformContext = { ...sourceContext, resolveUrlFn: () => undefined }

      expect(await transform(value, context)).toEqualHtml(value)
    })
  })

  describe('left untouched', () => {
    it('should leave a footnote ref whose definition is in the body', async () => {
      const value = html`
        <p>Claim.<sup><a href="#fn1">1</a></sup></p>
        <ol>
          <li id="fn1">The note.</li>
        </ol>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a ref whose definition target is a named anchor (Word/GDocs)', async () => {
      const value = html`
        <p>Claim.<sup><a href="#_ftn1">1</a></sup></p>
        <div><a name="_ftn1">The note.</a></div>
      `

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a non-footnote in-page link with no target', async () => {
      const value = '<p>See <a href="#section">the section</a> below.</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an off-page footnote-shaped link', async () => {
      const value = '<p>X<sup><a href="https://other.com/p#fn1">1</a></sup></p>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  it('should be idempotent', async () => {
    const value = '<p>Claim.<sup><a href="#fn1">1</a></sup></p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
