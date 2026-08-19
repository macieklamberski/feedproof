import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripWordBreaks } from './stripWordBreaks.js'

describeForEachParser('stripWordBreaks', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [stripWordBreaks(context)])
  }

  describe('happy paths', () => {
    it('should remove a standalone wbr', async () => {
      const value = '<p>super<wbr>cali</p>'
      const expected = '<p>supercali</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should merge the text a wbr fragments so a url stays whole', async () => {
      const value = '<p>https://youtu.be/<wbr>HnLpU5vd5rI</p>'
      const expected = '<p>https://youtu.be/HnLpU5vd5rI</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should remove several wbrs from one url', async () => {
      const value = '<p>https://youtu.be/<wbr>HnLpU5vd5rI?si=<wbr>abc</p>'
      const expected = '<p>https://youtu.be/HnLpU5vd5rI?si=abc</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave content without a wbr untouched', async () => {
      const value = '<p>plain text</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should be idempotent', async () => {
      const value = '<p>https://youtu.be/<wbr>HnLpU5vd5rI</p>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toEqualHtml(once)
    })
  })
})
