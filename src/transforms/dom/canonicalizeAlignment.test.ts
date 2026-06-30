import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { canonicalizeAlignment } from './canonicalizeAlignment.js'
import { flattenPictureElements } from './flattenPictureElements.js'
import { unwrapWrappers } from './unwrapWrappers.js'

describeForEachParser('canonicalizeAlignment', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [canonicalizeAlignment(context)])
  }

  describe('happy paths', () => {
    it('should map the aligncenter class on an image to a center hook', async () => {
      const value = '<img class="aligncenter" src="a.jpg">'
      const expected = '<img class="aligncenter" src="a.jpg" data-align="center">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should map the alignleft class to a left hook', async () => {
      const value = '<img class="alignleft" src="a.jpg">'
      const expected = '<img class="alignleft" src="a.jpg" data-align="left">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should map the alignright class to a right hook', async () => {
      const value = '<img class="alignright" src="a.jpg">'
      const expected = '<img class="alignright" src="a.jpg" data-align="right">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should read the deprecated align attribute', async () => {
      const value = '<img align="center" src="a.jpg">'

      expect(await transform(value)).toContainHtml('data-align="center"')
    })

    it('should center an image with auto horizontal margins', async () => {
      const value = '<img style="margin: 0 auto" src="a.jpg">'

      expect(await transform(value)).toContainHtml('data-align="center"')
    })

    it('should stamp the figure and keep its caption when the figure carries the signal', async () => {
      const value = html`
        <figure class="aligncenter">
          <img src="a.jpg">
          <figcaption>Caption</figcaption>
        </figure>
      `
      const expected = html`
        <figure class="aligncenter" data-align="center">
          <img src="a.jpg">
          <figcaption>Caption</figcaption>
        </figure>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should relocate a media-primary div signal onto the image', async () => {
      const value = '<div class="aligncenter"><img src="a.jpg"></div>'
      const expected = '<div class="aligncenter"><img src="a.jpg" data-align="center"></div>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should read a media-primary paragraph text-align', async () => {
      const value = '<p style="text-align: center"><img src="a.jpg"></p>'

      expect(await transform(value)).toContainHtml('data-align="center"')
    })

    it('should read a center wrapping an image, leaving the center in place', async () => {
      const value = '<center><img src="a.jpg"></center>'
      const expected = '<center><img src="a.jpg" data-align="center"></center>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should relocate a picture-level signal onto the inner image', async () => {
      const value = '<picture class="aligncenter"><img src="a.jpg"></picture>'
      const expected =
        '<picture class="aligncenter"><img src="a.jpg" data-align="center"></picture>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should align an iframe', async () => {
      const value = '<iframe class="alignright" src="https://example.com"></iframe>'
      const expected =
        '<iframe class="alignright" src="https://example.com" data-align="right"></iframe>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should stamp each media child of a multi-media wrapper', async () => {
      const value = '<div class="aligncenter"><img src="a.jpg"><img src="b.jpg"></div>'
      const expected = html`
        <div class="aligncenter">
        <img src="a.jpg" data-align="center"><img src="b.jpg" data-align="center"></div>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should fall through a non-alignment style to the align attribute', async () => {
      const value = '<img style="border: 1px solid red" align="center" src="a.jpg">'

      expect(await transform(value)).toContainHtml('data-align="center"')
    })

    it('should read a bare center class on an image', async () => {
      const value = '<a href="x.jpg"><img class="center" src="a.jpg"></a>'
      const expected = '<a href="x.jpg"><img class="center" src="a.jpg" data-align="center"></a>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should read a bare left class on an image', async () => {
      const value = '<img class="left" src="a.jpg">'
      const expected = '<img class="left" src="a.jpg" data-align="left">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should read a bare center class on a media-primary wrapper', async () => {
      const value = '<div class="center"><img src="a.jpg"></div>'
      const expected = '<div class="center"><img src="a.jpg" data-align="center"></div>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave a text paragraph alignment untouched', async () => {
      const value = '<p class="has-text-align-center">Some prose.</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave a text-align paragraph of prose untouched', async () => {
      const value = '<p style="text-align: center">Just some centered text.</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave an inline-only center untouched', async () => {
      const value = '<center>Plain centered text</center>'

      expect(await transform(value)).toBe(value)
    })

    it('should not stamp a wrapper that also holds prose', async () => {
      const value = '<div class="aligncenter"><img src="a.jpg"><p>A caption sentence.</p></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should not stamp an alignnone image', async () => {
      const value = '<img class="alignnone" src="a.jpg">'

      expect(await transform(value)).toBe(value)
    })

    it('should ignore a bare directional class on a wrapper that also holds prose', async () => {
      const value = '<div class="center"><img src="a.jpg"><p>A caption sentence.</p></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should not stamp a vertical align attribute', async () => {
      const value = '<img align="middle" src="a.jpg">'

      expect(await transform(value)).toBe(value)
    })

    it('should let the class win over a conflicting inline text-align', async () => {
      const value = '<img class="alignright" style="text-align: center" src="a.jpg">'

      expect(await transform(value)).toContainHtml('data-align="right"')
    })

    it('should keep an image own direction over its parent picture', async () => {
      const value = '<picture class="aligncenter"><img class="alignright" src="a.jpg"></picture>'

      expect(await transform(value)).toContainHtml('data-align="right"')
    })

    it('should leave a media element that already carries data-align unchanged', async () => {
      const value = '<img class="aligncenter" src="a.jpg" data-align="left">'

      expect(await transform(value)).toBe(value)
    })

    it('should leave content without alignment signals unchanged', async () => {
      const value = '<p>Nothing aligned here</p><img src="a.jpg">'

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value = '<center><img class="aligncenter" src="a.jpg"></center>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })

    it('should not restamp when applied multiple times to the same document', async () => {
      const value = '<div class="aligncenter"><img src="a.jpg"></div>'
      const expected = '<div class="aligncenter"><img src="a.jpg" data-align="center"></div>'
      const context = baseContext
      const result = await applyDomTransforms(parseHtml(value), [
        canonicalizeAlignment(context),
        canonicalizeAlignment(context),
        canonicalizeAlignment(context),
      ])

      expect(result).toEqualHtml(expected)
    })
  })

  describe('pipeline ordering', () => {
    it('should survive flattenPictureElements dissolving the picture', async () => {
      const value = '<picture class="aligncenter"><img src="a.jpg"></picture>'
      const expected = '<img src="a.jpg" data-align="center">'
      const context = baseContext
      const result = await applyDomTransforms(parseHtml(value), [
        canonicalizeAlignment(context),
        flattenPictureElements(context),
      ])

      expect(result).toEqualHtml(expected)
    })

    it('should survive unwrapWrappers dissolving the div', async () => {
      // The aligncenter class lives on the div, which unwrapWrappers dissolves; only the
      // relocated data-align hook survives on the image — which is the point of the ordering.
      const value = '<div class="aligncenter"><img src="a.jpg"></div>'
      const expected = '<img src="a.jpg" data-align="center">'
      const context = baseContext
      const result = await applyDomTransforms(parseHtml(value), [
        canonicalizeAlignment(context),
        unwrapWrappers(context),
      ])

      expect(result).toEqualHtml(expected)
    })
  })
})
