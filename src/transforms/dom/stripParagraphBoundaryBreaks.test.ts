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
  const transform = (html: string) => {
    return transformHtml(html, stripParagraphBoundaryBreaks(context))
  }

  describe('happy paths', () => {
    it('should remove leading br from paragraph', async () => {
      expect(await transform('<p><br>Text</p>')).toBe('<p>Text</p>')
    })

    it('should remove trailing br from paragraph', async () => {
      expect(await transform('<p>Text<br></p>')).toBe('<p>Text</p>')
    })

    it('should remove both leading and trailing br', async () => {
      expect(await transform('<p><br>Text<br></p>')).toBe('<p>Text</p>')
    })

    it('should remove multiple consecutive br at boundaries', async () => {
      expect(await transform('<p><br><br>Text<br><br></p>')).toBe('<p>Text</p>')
    })

    it('should remove whitespace text nodes alongside boundary br', async () => {
      expect(await transform('<p> <br>Text<br> </p>')).toBe('<p>Text</p>')
    })

    it('should preserve interior br', async () => {
      const value = '<p>Line one<br>Line two</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should process multiple paragraphs independently', async () => {
      expect(await transform('<p><br>First<br></p><p><br>Second<br></p>')).toBe(
        '<p>First</p><p>Second</p>',
      )
    })
  })

  describe('edge cases', () => {
    it('should leave paragraph unchanged when it has no br', async () => {
      const value = '<p>Just text</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should empty paragraph with only br content', async () => {
      expect(await transform('<p><br></p>')).toBe('<p></p>')
    })

    it('should not touch br outside paragraphs', async () => {
      const value = '<p>Text</p><br><div>Block</div>'

      expect(await transform(value)).toBe(value)
    })

    it('should not strip boundary br from div', async () => {
      const value = '<div><br>Text<br></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should not strip boundary br from blockquote', async () => {
      const value = '<blockquote><br>Quote<br></blockquote>'

      expect(await transform(value)).toBe(value)
    })

    it('should not strip boundary br from li', async () => {
      const value = '<ul><li><br>Item<br></li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should not strip boundary br from heading', async () => {
      const value = '<h2><br>Heading<br></h2>'

      expect(await transform(value)).toBe(value)
    })

    it('should strip from p but leave sibling div untouched', async () => {
      expect(await transform('<p><br>Para<br></p><div><br>Div<br></div>')).toBe(
        '<p>Para</p><div><br>Div<br></div>',
      )
    })

    it('should be idempotent', async () => {
      const once = await transform('<p><br>Text<br></p>')
      const twice = await transform(once)

      expect(twice).toBe(once)
    })

    it('should leave paragraph with only boundary whitespace alone', async () => {
      const value = '<p> <em>Hi</em> </p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave paragraph with leading whitespace but no br alone', async () => {
      const value = '<p>  <span>Hi</span></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should strip boundary br nested inside blockquote', async () => {
      expect(await transform('<blockquote><p><br>Quoted<br></p></blockquote>')).toBe(
        '<blockquote><p>Quoted</p></blockquote>',
      )
    })

    it('should strip boundary br nested inside figure', async () => {
      expect(await transform('<figure><p><br>Caption</p></figure>')).toBe(
        '<figure><p>Caption</p></figure>',
      )
    })

    it('should strip boundary br nested inside list item', async () => {
      expect(await transform('<ul><li><p>Item<br></p></li></ul>')).toBe(
        '<ul><li><p>Item</p></li></ul>',
      )
    })

    it('should strip boundary br with adjacent comment', async () => {
      expect(await transform('<p><!-- note --><br>Hi</p>')).toBe('<p>Hi</p>')
    })

    it('should strip trailing br with adjacent comment', async () => {
      expect(await transform('<p>Hi<br><!-- note --></p>')).toBe('<p>Hi</p>')
    })

    it('should leave paragraph with only non-br skippables alone', async () => {
      const value = '<p> <!-- note --> </p>'

      expect(await transform(value)).toBe(value)
    })
  })
})
