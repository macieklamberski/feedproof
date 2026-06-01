import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { stripBoundaryBreaks } from './stripBoundaryBreaks.js'

describeForEachParser('stripBoundaryBreaks', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripBoundaryBreaks(context)])
  }

  describe('happy paths', () => {
    it('should remove leading br from paragraph', async () => {
      const value = '<p><br>Text</p>'
      const expected = '<p>Text</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove trailing br from paragraph', async () => {
      const value = '<p>Text<br></p>'
      const expected = '<p>Text</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove both leading and trailing br', async () => {
      const value = '<p><br>Text<br></p>'
      const expected = '<p>Text</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove multiple consecutive br at boundaries', async () => {
      const value = '<p><br><br>Text<br><br></p>'
      const expected = '<p>Text</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove whitespace text nodes alongside boundary br', async () => {
      const value = '<p> <br>Text<br> </p>'
      const expected = '<p>Text</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve interior br', async () => {
      const value = '<p>Line one<br>Line two</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should process multiple paragraphs independently', async () => {
      const value = '<p><br>First<br></p><p><br>Second<br></p>'
      const expected = '<p>First</p><p>Second</p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('block elements', () => {
    it('should strip boundary br from div', async () => {
      const value = '<div><br>Text<br></div>'
      const expected = '<div>Text</div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip boundary br from blockquote', async () => {
      const value = '<blockquote><br>Quote<br></blockquote>'
      const expected = '<blockquote>Quote</blockquote>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip boundary br from list item', async () => {
      const value = '<ul><li><br>Item<br></li></ul>'
      const expected = '<ul><li>Item</li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip leading br before the first list item in ul', async () => {
      const value = '<ul><br><li>Item</li></ul>'
      const expected = '<ul><li>Item</li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip trailing br after the last list item in ol', async () => {
      const value = '<ol><li>Item</li><br></ol>'
      const expected = '<ol><li>Item</li></ol>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve br between list items', async () => {
      const value = '<ul><li>One</li><br><li>Two</li></ul>'

      expect(await transform(value)).toBe(value)
    })

    it('should strip boundary br from heading', async () => {
      const value = '<h2><br>Heading<br></h2>'
      const expected = '<h2>Heading</h2>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip boundary br from figcaption', async () => {
      const value = '<figure><figcaption><br>Caption<br></figcaption></figure>'
      const expected = '<figure><figcaption>Caption</figcaption></figure>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip boundary br from section', async () => {
      const value = '<section><br>Content<br></section>'
      const expected = '<section>Content</section>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip from both p and sibling div', async () => {
      const value = '<p><br>Para<br></p><div><br>Div<br></div>'
      const expected = '<p>Para</p><div>Div</div>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('exclusions', () => {
    it('should not strip boundary br from table cells', async () => {
      const value =
        '<table><tbody><tr><td><br>Cell<br></td><th><br>Head<br></th></tr></tbody></table>'

      expect(await transform(value)).toBe(value)
    })

    it('should not strip boundary br from definition list terms', async () => {
      const value = '<dl><dt><br>Term<br></dt><dd><br>Definition<br></dd></dl>'

      expect(await transform(value)).toBe(value)
    })

    it('should not strip boundary br from pre', async () => {
      const value = '<pre><br>code<br></pre>'

      expect(await transform(value)).toBe(value)
    })

    it('should not touch br between sibling blocks', async () => {
      const value = '<p>Text</p><br><div>Block</div>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('edge cases', () => {
    it('should leave paragraph unchanged when it has no br', async () => {
      const value = '<p>Just text</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should empty paragraph with only br content', async () => {
      const value = '<p><br></p>'
      const expected = '<p></p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should empty div with only br content', async () => {
      const value = '<div><br></div>'
      const expected = '<div></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should be idempotent', async () => {
      const value = '<div><br>Text<br></div>'
      const once = await transform(value)
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
      const value = '<blockquote><p><br>Quoted<br></p></blockquote>'
      const expected = '<blockquote><p>Quoted</p></blockquote>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip boundary br nested inside figure', async () => {
      const value = '<figure><p><br>Caption</p></figure>'
      const expected = '<figure><p>Caption</p></figure>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip boundary br nested inside list item', async () => {
      const value = '<ul><li><p>Item<br></p></li></ul>'
      const expected = '<ul><li><p>Item</p></li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip boundary br with adjacent comment', async () => {
      const value = '<p><!-- note --><br>Hi</p>'
      const expected = '<p>Hi</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip trailing br with adjacent comment', async () => {
      const value = '<p>Hi<br><!-- note --></p>'
      const expected = '<p>Hi</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave paragraph with only non-br skippables alone', async () => {
      const value = '<p> <!-- note --> </p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('nested inline wrappers', () => {
    it('should strip a trailing br nested inside an inline element', async () => {
      const value = '<p>x<em>y<br></em></p>'
      const expected = '<p>x<em>y</em></p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip both a direct trailing br and one nested inside an inline element', async () => {
      const value = '<p>x<em>y<br></em><br></p>'
      const expected = '<p>x<em>y</em></p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip a trailing br through deeply nested inline wrappers', async () => {
      const value = '<p><strong><em>y<br></em></strong></p>'
      const expected = '<p><strong><em>y</em></strong></p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should strip a leading br nested inside an inline element', async () => {
      const value = '<p><em><br>lead</em>tail</p>'
      const expected = '<p><em>lead</em>tail</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve an interior br inside an inline element', async () => {
      const value = '<p>keep<em>mid<br>line</em>end</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should preserve a wrapper-edge br when text follows the wrapper', async () => {
      const value = '<p>Something <span>one<br></span> more</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should preserve a wrapper-edge br when another element follows the wrapper', async () => {
      const value = '<p><em>one<br></em><span>tail</span></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should strip the same wrapper-edge br once the wrapper is at the block edge', async () => {
      const value = '<p>Something <span>one<br></span></p>'
      const expected = '<p>Something <span>one</span></p>'

      expect(await transform(value)).toBe(expected)
    })
  })
})
