import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { stripParagraphBoundaryBreaks } from './stripParagraphBoundaryBreaks.js'

const context: TransformContext = {}

describe('stripParagraphBoundaryBreaks', () => {
  describe('happy paths', () => {
    it('should remove leading br from paragraph', () => {
      const value = '<p><br>Text</p>'
      const expected = '<p>Text</p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should remove trailing br from paragraph', () => {
      const value = '<p>Text<br></p>'
      const expected = '<p>Text</p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should remove both leading and trailing br', () => {
      const value = '<p><br>Text<br></p>'
      const expected = '<p>Text</p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should remove multiple consecutive br at boundaries', () => {
      const value = '<p><br><br>Text<br><br></p>'
      const expected = '<p>Text</p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should remove whitespace text nodes alongside boundary br', () => {
      const value = '<p> <br>Text<br> </p>'
      const expected = '<p>Text</p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should preserve interior br', () => {
      const value = '<p>Line one<br>Line two</p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should process multiple paragraphs independently', () => {
      const value = '<p><br>First<br></p><p><br>Second<br></p>'
      const expected = '<p>First</p><p>Second</p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave paragraph unchanged when it has no br', () => {
      const value = '<p>Just text</p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should empty paragraph with only br content', () => {
      const value = '<p><br></p>'
      const expected = '<p></p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should not touch br outside paragraphs', () => {
      const value = '<p>Text</p><br><div>Block</div>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should not strip boundary br from div', () => {
      const value = '<div><br>Text<br></div>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should not strip boundary br from blockquote', () => {
      const value = '<blockquote><br>Quote<br></blockquote>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should not strip boundary br from li', () => {
      const value = '<ul><li><br>Item<br></li></ul>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should not strip boundary br from heading', () => {
      const value = '<h2><br>Heading<br></h2>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should strip from p but leave sibling div untouched', () => {
      const value = '<p><br>Para<br></p><div><br>Div<br></div>'
      const expected = '<p>Para</p><div><br>Div<br></div>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should be idempotent', () => {
      const value = '<p><br>Text<br></p>'
      const once = transformHtml(value, stripParagraphBoundaryBreaks(context))
      const twice = transformHtml(once, stripParagraphBoundaryBreaks(context))

      expect(twice).toBe(once)
    })

    it('should leave paragraph with only boundary whitespace alone', () => {
      const value = '<p> <em>Hi</em> </p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should leave paragraph with leading whitespace but no br alone', () => {
      const value = '<p>  <span>Hi</span></p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should strip boundary br nested inside blockquote', () => {
      const value = '<blockquote><p><br>Quoted<br></p></blockquote>'
      const expected = '<blockquote><p>Quoted</p></blockquote>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should strip boundary br nested inside figure', () => {
      const value = '<figure><p><br>Caption</p></figure>'
      const expected = '<figure><p>Caption</p></figure>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should strip boundary br nested inside list item', () => {
      const value = '<ul><li><p>Item<br></p></li></ul>'
      const expected = '<ul><li><p>Item</p></li></ul>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should strip boundary br with adjacent comment', () => {
      const value = '<p><!-- note --><br>Hi</p>'
      const expected = '<p>Hi</p>'

      expect(transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })
  })
})
