import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { unwrapDoublyNestedLists } from './unwrapDoublyNestedLists.js'

describeForEachParser('unwrapDoublyNestedLists', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [unwrapDoublyNestedLists(context)])
  }

  describe('happy paths', () => {
    it('should unwrap a wp-block-list ul wrapper', async () => {
      const value = html`
        <ul class="wp-block-list"><li style="list-style-type: none;"><ul><li>A</li><li>B</li></ul>
        </li></ul>
      `
      const expected = '<ul><li>A</li><li>B</li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should unwrap a wp-block-list ol wrapper', async () => {
      const value = html`
        <ol class="wp-block-list"><li style="list-style-type: none;"><ol><li>One</li><li>Two</li>
        </ol></li></ol>
      `
      const expected = '<ol><li>One</li><li>Two</li></ol>'

      expect(await transform(value)).toBe(expected)
    })

    it('should unwrap a plain doubly-nested ul without attributes', async () => {
      const value = '<ul><li><ul><li>A</li></ul></li></ul>'
      const expected = '<ul><li>A</li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should unwrap and keep whitespace text nodes around the inner list', async () => {
      const value = '<ul><li>\n  <ul><li>A</li></ul>\n</li></ul>'
      const expected = '\n  <ul><li>A</li></ul>\n'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve nbsp text in the wrapper li as a separator', async () => {
      const value = '<ul><li>\u00A0<ul><li>A</li></ul></li></ul>'
      const expected = '&#160;<ul><li>A</li></ul>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should unwrap when a comment sits beside the inner list', async () => {
      const value = '<ul><li><!-- note --><ul><li>A</li></ul></li></ul>'
      const expected = '<ul><li>A</li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should unwrap when a br sits beside the inner list', async () => {
      const value = '<ul><li><br><ul><li>A</li></ul></li></ul>'
      const expected = '<ul><li>A</li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should collapse triple nesting on successive iterations', async () => {
      const value = '<ul><li><ul><li><ul><li>A</li><li>B</li></ul></li></ul></li></ul>'
      const expected = '<ul><li>A</li><li>B</li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should unwrap multiple sibling wrapper lists independently', async () => {
      const value = html`
        <ul><li><ul><li>A</li></ul></li></ul>
        <ol><li><ol><li>One</li></ol></li></ol>
      `
      const expected = html`
        <ul><li>A</li></ul>
        <ol><li>One</li></ol>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should drop the outer list class and id', async () => {
      const value = html`
        <ul class="outer" id="o"><li><ul class="inner" id="i"><li>A</li></ul></li></ul>
      `
      const expected = '<ul class="inner" id="i"><li>A</li></ul>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should not unwrap when the outer has more than one li', async () => {
      const value = '<ul><li><ul><li>A</li></ul></li><li>B</li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should not unwrap when the wrapper li has leading text', async () => {
      const value = '<ul><li>note <ul><li>A</li></ul></li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should not unwrap when the wrapper li has trailing text', async () => {
      const value = '<ul><li><ul><li>A</li></ul> footer</li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should not unwrap when an unrelated element sits beside the inner list', async () => {
      const value = '<ul><li><p></p><ul><li>A</li></ul></li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should not unwrap when the inner list type differs from the outer (ul wrapping ol)', async () => {
      const value = '<ul><li><ol><li>One</li></ol></li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should not unwrap when the inner list type differs from the outer (ol wrapping ul)', async () => {
      const value = '<ol><li><ul><li>A</li></ul></li></ol>'

      expect(await transform(value)).toBe(value)
    })

    it('should not unwrap when the wrapper holds two inner lists', async () => {
      const value = '<ul><li><ul><li>A</li></ul><ul><li>B</li></ul></li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should not unwrap when the outer holds a non-li element', async () => {
      const value = '<ul><div><ul><li>A</li></ul></div></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave a flat single-item list alone', async () => {
      const value = '<ul><li>A</li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave content with no lists unchanged', async () => {
      const value = '<p>Plain content</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should handle empty input', async () => {
      expect(await transform('')).toBe('')
    })

    it('should preserve a legitimate nested list inside a multi-item parent', async () => {
      const value = '<ul><li>A<ul><li>A.1</li></ul></li><li>B</li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value = '<ul><li><ul><li><ul><li>A</li><li>B</li></ul></li></ul></li></ul>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })
})
