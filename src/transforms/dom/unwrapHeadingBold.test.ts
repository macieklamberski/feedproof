import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { unwrapHeadingBold } from './unwrapHeadingBold.js'

describeForEachParser('unwrapHeadingBold', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [unwrapHeadingBold(context)])
  }

  describe('happy paths', () => {
    it('should unwrap a strong that wraps the whole heading', async () => {
      const value = '<h2><strong>Title</strong></h2>'
      const expected = '<h2>Title</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should unwrap a b that wraps the whole heading', async () => {
      const value = '<h3><b>Title</b></h3>'
      const expected = '<h3>Title</h3>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should unwrap across heading levels', async () => {
      const value = html`
        <h1>
          <strong>One</strong>
        </h1>
        <h4>
          <b>Four</b>
        </h4>
      `
      const expected = html`
        <h1>One</h1>
        <h4>Four</h4>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should preserve inner inline markup', async () => {
      const value = '<h2><strong>Hello <em>world</em></strong></h2>'
      const expected = '<h2>Hello <em>world</em></h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should ignore surrounding whitespace', async () => {
      const value = '<h2> <strong>Title</strong> </h2>'
      const expected = '<h2> Title </h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should ignore a comment sibling of the bold wrapper', async () => {
      const value = '<h2><!-- anchor --><strong>Title</strong></h2>'
      const expected = '<h2><!-- anchor -->Title</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('stacking', () => {
    it('should collapse nested b and strong wrappers', async () => {
      const value = '<h2><b><strong>Title</strong></b></h2>'
      const expected = '<h2>Title</h2>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('edge cases', () => {
    it('should be idempotent', async () => {
      const value = '<h2><strong>Title</strong></h2>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })

    it('should leave a heading where bold does not wrap the whole content', async () => {
      const value = '<h2><strong>Part</strong> and more</h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave two sibling bold wrappers alone', async () => {
      const value = '<h2><strong>A</strong><strong>B</strong></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave bold nested under another element', async () => {
      const value = '<h2><a href="https://example.com/"><strong>Title</strong></a></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave bold outside any heading', async () => {
      const value = '<p><strong>Not a heading</strong></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a heading with no bold', async () => {
      const value = '<h2>Plain title</h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave an empty heading', async () => {
      const value = '<h2></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should handle empty input', async () => {
      expect(await transform('')).toEqualHtml('')
    })

    it('should unwrap past an inline element holding neither text nor media', async () => {
      const value = html`
        <h4>
          <strong>
            <a href="https://example.com/work">Work</a>
          </strong>
          <a href="https://example.com/work"> </a>
        </h4>
      `
      const expected = html`
        <h4>
          <a href="https://example.com/work">Work</a>
          <a href="https://example.com/work"> </a>
        </h4>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep the bold when the sibling element holds text', async () => {
      const value = '<h2><strong>Title</strong><a href="https://example.com">More</a></h2>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep the bold when the sibling element holds media', async () => {
      const value = html`
        <h2>
          <strong>Title</strong>
          <a href="https://example.com">
            <img src="https://example.com/icon.png">
          </a>
        </h2>
      `

      expect(await transform(value)).toEqualHtml(value)
    })
  })
})
