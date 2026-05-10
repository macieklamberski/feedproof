import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import type { TransformContext } from '../../types.js'
import { unwrapDoublyNestedLists } from './unwrapDoublyNestedLists.js'

const context: TransformContext = {}

describe('unwrapDoublyNestedLists', () => {
  const unwrap = unwrapDoublyNestedLists(context)

  describe('happy paths', () => {
    it('should unwrap a wp-block-list ul wrapper', () => {
      const value =
        '<ul class="wp-block-list"><li style="list-style-type: none;"><ul><li>A</li><li>B</li></ul></li></ul>'
      const expected = '<ul><li>A</li><li>B</li></ul>'

      expect(transformHtml(value, unwrap)).toBe(expected)
    })

    it('should unwrap a wp-block-list ol wrapper', () => {
      const value =
        '<ol class="wp-block-list"><li style="list-style-type: none;"><ol><li>One</li><li>Two</li></ol></li></ol>'
      const expected = '<ol><li>One</li><li>Two</li></ol>'

      expect(transformHtml(value, unwrap)).toBe(expected)
    })

    it('should unwrap a plain doubly-nested ul without attributes', () => {
      const value = '<ul><li><ul><li>A</li></ul></li></ul>'
      const expected = '<ul><li>A</li></ul>'

      expect(transformHtml(value, unwrap)).toBe(expected)
    })

    it('should unwrap when whitespace surrounds the inner list', () => {
      const value = '<ul><li>\n  <ul><li>A</li></ul>\n</li></ul>'
      const expected = '<ul><li>A</li></ul>'

      expect(transformHtml(value, unwrap)).toBe(expected)
    })

    it('should unwrap when a comment sits beside the inner list', () => {
      const value = '<ul><li><!-- note --><ul><li>A</li></ul></li></ul>'
      const expected = '<ul><li>A</li></ul>'

      expect(transformHtml(value, unwrap)).toBe(expected)
    })

    it('should unwrap when a br sits beside the inner list', () => {
      const value = '<ul><li><br><ul><li>A</li></ul></li></ul>'
      const expected = '<ul><li>A</li></ul>'

      expect(transformHtml(value, unwrap)).toBe(expected)
    })

    it('should collapse triple nesting on successive iterations', () => {
      const value = '<ul><li><ul><li><ul><li>A</li><li>B</li></ul></li></ul></li></ul>'
      const expected = '<ul><li>A</li><li>B</li></ul>'

      expect(transformHtml(value, unwrap)).toBe(expected)
    })

    it('should unwrap multiple sibling wrapper lists independently', () => {
      const value = '<ul><li><ul><li>A</li></ul></li></ul><ol><li><ol><li>One</li></ol></li></ol>'
      const expected = '<ul><li>A</li></ul><ol><li>One</li></ol>'

      expect(transformHtml(value, unwrap)).toBe(expected)
    })

    it('should drop the outer list class and id', () => {
      const value =
        '<ul class="outer" id="o"><li><ul class="inner" id="i"><li>A</li></ul></li></ul>'
      const result = transformHtml(value, unwrap)

      expect(result).toBe('<ul class="inner" id="i"><li>A</li></ul>')
    })
  })

  describe('edge cases', () => {
    it('should not unwrap when the outer has more than one li', () => {
      const value = '<ul><li><ul><li>A</li></ul></li><li>B</li></ul>'

      expect(transformHtml(value, unwrap)).toBe(value)
    })

    it('should not unwrap when the wrapper li has leading text', () => {
      const value = '<ul><li>note <ul><li>A</li></ul></li></ul>'

      expect(transformHtml(value, unwrap)).toBe(value)
    })

    it('should not unwrap when the wrapper li has trailing text', () => {
      const value = '<ul><li><ul><li>A</li></ul> footer</li></ul>'

      expect(transformHtml(value, unwrap)).toBe(value)
    })

    it('should not unwrap when an unrelated element sits beside the inner list', () => {
      const value = '<ul><li><p></p><ul><li>A</li></ul></li></ul>'

      expect(transformHtml(value, unwrap)).toBe(value)
    })

    it('should not unwrap when the inner list type differs from the outer (ul wrapping ol)', () => {
      const value = '<ul><li><ol><li>One</li></ol></li></ul>'

      expect(transformHtml(value, unwrap)).toBe(value)
    })

    it('should not unwrap when the inner list type differs from the outer (ol wrapping ul)', () => {
      const value = '<ol><li><ul><li>A</li></ul></li></ol>'

      expect(transformHtml(value, unwrap)).toBe(value)
    })

    it('should not unwrap when the wrapper holds two inner lists', () => {
      const value = '<ul><li><ul><li>A</li></ul><ul><li>B</li></ul></li></ul>'

      expect(transformHtml(value, unwrap)).toBe(value)
    })

    it('should not unwrap when the outer holds a non-li element', () => {
      const value = '<ul><div><ul><li>A</li></ul></div></ul>'
      const result = transformHtml(value, unwrap)

      expect(result).toContain('<div>')
      expect(result).toContain('<ul><li>A</li></ul>')
    })

    it('should leave a flat single-item list alone', () => {
      const value = '<ul><li>A</li></ul>'

      expect(transformHtml(value, unwrap)).toBe(value)
    })

    it('should leave content with no lists unchanged', () => {
      const value = '<p>Plain content</p>'

      expect(transformHtml(value, unwrap)).toBe(value)
    })

    it('should handle empty input', () => {
      expect(transformHtml('', unwrap)).toBe('')
    })

    it('should preserve a legitimate nested list inside a multi-item parent', () => {
      const value = '<ul><li>A<ul><li>A.1</li></ul></li><li>B</li></ul>'

      expect(transformHtml(value, unwrap)).toBe(value)
    })
  })
})
