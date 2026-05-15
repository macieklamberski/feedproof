import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { stripParagraphBoundaryBreaks } from './stripParagraphBoundaryBreaks.js'

const context: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('stripParagraphBoundaryBreaks', () => {
  describe('happy paths', () => {
    it('should remove leading br from paragraph', async () => {
      const value = '<p><br>Text</p>'
      const expected = '<p>Text</p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should remove trailing br from paragraph', async () => {
      const value = '<p>Text<br></p>'
      const expected = '<p>Text</p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should remove both leading and trailing br', async () => {
      const value = '<p><br>Text<br></p>'
      const expected = '<p>Text</p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should remove multiple consecutive br at boundaries', async () => {
      const value = '<p><br><br>Text<br><br></p>'
      const expected = '<p>Text</p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should remove whitespace text nodes alongside boundary br', async () => {
      const value = '<p> <br>Text<br> </p>'
      const expected = '<p>Text</p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should preserve interior br', async () => {
      const value = '<p>Line one<br>Line two</p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should process multiple paragraphs independently', async () => {
      const value = '<p><br>First<br></p><p><br>Second<br></p>'
      const expected = '<p>First</p><p>Second</p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave paragraph unchanged when it has no br', async () => {
      const value = '<p>Just text</p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should empty paragraph with only br content', async () => {
      const value = '<p><br></p>'
      const expected = '<p></p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should not touch br outside paragraphs', async () => {
      const value = '<p>Text</p><br><div>Block</div>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should not strip boundary br from div', async () => {
      const value = '<div><br>Text<br></div>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should not strip boundary br from blockquote', async () => {
      const value = '<blockquote><br>Quote<br></blockquote>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should not strip boundary br from li', async () => {
      const value = '<ul><li><br>Item<br></li></ul>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should not strip boundary br from heading', async () => {
      const value = '<h2><br>Heading<br></h2>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should strip from p but leave sibling div untouched', async () => {
      const value = '<p><br>Para<br></p><div><br>Div<br></div>'
      const expected = '<p>Para</p><div><br>Div<br></div>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should be idempotent', async () => {
      const value = '<p><br>Text<br></p>'
      const once = await transformHtml(value, stripParagraphBoundaryBreaks(context))
      const twice = await transformHtml(once, stripParagraphBoundaryBreaks(context))

      expect(twice).toBe(once)
    })

    it('should leave paragraph with only boundary whitespace alone', async () => {
      const value = '<p> <em>Hi</em> </p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should leave paragraph with leading whitespace but no br alone', async () => {
      const value = '<p>  <span>Hi</span></p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })

    it('should strip boundary br nested inside blockquote', async () => {
      const value = '<blockquote><p><br>Quoted<br></p></blockquote>'
      const expected = '<blockquote><p>Quoted</p></blockquote>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should strip boundary br nested inside figure', async () => {
      const value = '<figure><p><br>Caption</p></figure>'
      const expected = '<figure><p>Caption</p></figure>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should strip boundary br nested inside list item', async () => {
      const value = '<ul><li><p>Item<br></p></li></ul>'
      const expected = '<ul><li><p>Item</p></li></ul>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should strip boundary br with adjacent comment', async () => {
      const value = '<p><!-- note --><br>Hi</p>'
      const expected = '<p>Hi</p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should strip trailing br with adjacent comment', async () => {
      const value = '<p>Hi<br><!-- note --></p>'
      const expected = '<p>Hi</p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(expected)
    })

    it('should leave paragraph with only non-br skippables alone', async () => {
      const value = '<p> <!-- note --> </p>'

      expect(await transformHtml(value, stripParagraphBoundaryBreaks(context))).toBe(value)
    })
  })
})
