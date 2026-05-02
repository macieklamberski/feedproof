import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { convertBreaksToParagraphs } from './convertBreaksToParagraphs.js'

const context: TransformContext = {}

describe('convertBreaksToParagraphs', () => {
  describe('happy paths', () => {
    it('should convert <br><br> separated text into paragraphs', () => {
      const value = '<div>First text<br><br>Second text<br><br>Third text</div>'
      const expected = '<div><p>First text</p><p>Second text</p><p>Third text</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should treat 3 or more consecutive <br> as a single break', () => {
      const value = '<div>First<br><br><br><br>Second</div>'
      const expected = '<div><p>First</p><p>Second</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should preserve single <br> within a paragraph', () => {
      const value = '<div>Line one<br>Line two<br><br>New paragraph</div>'
      const expected = '<div><p>Line one<br>Line two</p><p>New paragraph</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should treat whitespace between <br> tags as part of the run', () => {
      const value = '<div>First<br>\n  <br>Second</div>'
      const expected = '<div><p>First</p><p>Second</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should preserve inline elements within paragraphs', () => {
      const value = '<div>Hello <strong>world</strong><br><br>How are you?</div>'
      const expected = '<div><p>Hello <strong>world</strong></p><p>How are you?</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should wrap mixed inline content including images', () => {
      const value = '<div>Caption text<br><br><img src="x.jpg" alt="photo"></div>'
      const expected = '<div><p>Caption text</p><p><img src="x.jpg" alt="photo"></p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should preserve existing <p> tags interleaved with <br><br>', () => {
      const value = '<div>Lead-in<br><br><p>Existing</p><br><br>Tail</div>'
      const expected = '<div><p>Lead-in</p><p>Existing</p><p>Tail</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should process <blockquote> as a loose container', () => {
      const value = '<blockquote>One<br><br>Two</blockquote>'
      const expected = '<blockquote><p>One</p><p>Two</p></blockquote>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should process <li> as a loose container', () => {
      const value = '<ul><li>One<br><br>Two</li></ul>'
      const expected = '<ul><li><p>One</p><p>Two</p></li></ul>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should process <td> as a loose container', () => {
      const value = '<table><tr><td>One<br><br>Two</td></tr></table>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toContain(
        '<td><p>One</p><p>Two</p></td>',
      )
    })

    it('should process nested loose containers independently', () => {
      const value = '<article><p>Existing</p><div>Inline<br><br>More inline</div></article>'
      const expected =
        '<article><p>Existing</p><div><p>Inline</p><p>More inline</p></div></article>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should normalize self-closing <br/> variants', () => {
      const value = '<div>One<br/><br/>Two</div>'
      const expected = '<div><p>One</p><p>Two</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should recognize <br> with attributes', () => {
      const value = '<div>One<br class="x"><br id="y">Two</div>'
      const expected = '<div><p>One</p><p>Two</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should not wrap chunks containing block elements', () => {
      const value = '<div>Text<br><br><div>Block</div><br><br>More text</div>'
      const expected = '<div><p>Text</p><div>Block</div><p>More text</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should not wrap chunk containing block-void <hr>', () => {
      const value = '<div>Text<br><br><hr><br><br>More</div>'
      const expected = '<div><p>Text</p><hr><p>More</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should drop leading <br><br>', () => {
      const value = '<div><br><br>Text</div>'
      const expected = '<div><p>Text</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should drop trailing <br><br>', () => {
      const value = '<div>Text<br><br></div>'
      const expected = '<div><p>Text</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should skip whitespace-only chunks', () => {
      const value = '<div>Text<br><br>   <br><br>More</div>'
      const expected = '<div><p>Text</p><p>More</p></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should not collapse <br> separated by an inline element', () => {
      const value = '<div>One<br><span>x</span><br>Two</div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(value)
    })

    it('should not collapse <br> separated by a comment', () => {
      const value = '<div>One<br><!--gap--><br>Two</div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(value)
    })

    it('should not touch <br><br> inside <pre>', () => {
      const value = '<pre>code line 1<br><br>code line 2</pre>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(value)
    })

    it('should not touch <br><br> inside <code>', () => {
      const value = '<code>line 1<br><br>line 2</code>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(value)
    })

    it('should empty a container with only <br>s', () => {
      const value = '<div><br><br><br></div>'
      const expected = '<div></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(expected)
    })

    it('should be idempotent', () => {
      const value = '<div>First<br><br>Second<br><br>Third</div>'
      const once = transformHtml(value, convertBreaksToParagraphs(context))
      const twice = transformHtml(once, convertBreaksToParagraphs(context))

      expect(twice).toBe(once)
    })

    it('should leave content alone when no <br><br> is present', () => {
      const value = '<div>Just some text</div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(value)
    })

    it('should leave single <br> alone', () => {
      const value = '<div>First<br>Second</div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(value)
    })

    it('should handle empty container', () => {
      const value = '<div></div>'

      expect(transformHtml(value, convertBreaksToParagraphs(context))).toBe(value)
    })
  })
})
