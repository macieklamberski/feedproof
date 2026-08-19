import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripHiddenElements } from './stripHiddenElements.js'

describeForEachParser('stripHiddenElements', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [stripHiddenElements(context)])
  }

  describe('removes hidden elements', () => {
    it('should remove an element with the hidden attribute', async () => {
      const value = '<p>Keep</p><div hidden>Gone</div>'
      const expected = '<p>Keep</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove an element with inline display:none', async () => {
      const value = '<p>Keep</p><div style="display:none">Gone</div>'
      const expected = '<p>Keep</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove an element with inline visibility:hidden', async () => {
      const value = '<p>Keep</p><span style="visibility:hidden">Gone</span>'
      const expected = '<p>Keep</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove the whole hidden subtree', async () => {
      const value = '<div style="display:none"><p>a</p><img src="x.jpg"></div><p>Keep</p>'
      const expected = '<p>Keep</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('leaves visible content', () => {
    it('should keep a normal element', async () => {
      const value = '<div style="color:red">Visible</div>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not remove opacity:0 (left to removeTrackingPixels)', async () => {
      const value = '<img src="x.jpg" style="opacity:0">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should be idempotent', async () => {
      const value = '<p>Keep</p><div style="display:none">Gone</div>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })
  })
})
