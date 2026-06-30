import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertBreaksToParagraphs } from './convertBreaksToParagraphs.js'

describeForEachParser('convertBreaksToParagraphs', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [convertBreaksToParagraphs(context)])
  }

  describe('happy paths', () => {
    it('should convert <br><br> separated text into paragraphs', async () => {
      const value = '<div>First text<br><br>Second text<br><br>Third text</div>'
      const expected = '<div><p>First text</p><p>Second text</p><p>Third text</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should treat 3 or more consecutive <br> as a single break', async () => {
      const value = '<div>First<br><br><br><br>Second</div>'
      const expected = '<div><p>First</p><p>Second</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve single <br> within a paragraph', async () => {
      const value = '<div>Line one<br>Line two<br><br>New paragraph</div>'
      const expected = '<div><p>Line one<br>Line two</p><p>New paragraph</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should treat whitespace between <br> tags as part of the run', async () => {
      const value = '<div>First<br>\n  <br>Second</div>'
      const expected = '<div><p>First</p><p>Second</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve inline elements within paragraphs', async () => {
      const value = '<div>Hello <strong>world</strong><br><br>How are you?</div>'
      const expected = '<div><p>Hello <strong>world</strong></p><p>How are you?</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should wrap mixed inline content including images', async () => {
      const value = '<div>Caption text<br><br><img src="x.jpg" alt="photo"></div>'
      const expected = '<div><p>Caption text</p><p><img src="x.jpg" alt="photo"></p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve existing <p> tags interleaved with <br><br>', async () => {
      const value = '<div>Lead-in<br><br><p>Existing</p><br><br>Tail</div>'
      const expected = '<div><p>Lead-in</p><p>Existing</p><p>Tail</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should process <blockquote> as a loose container', async () => {
      const value = '<blockquote>One<br><br>Two</blockquote>'
      const expected = '<blockquote><p>One</p><p>Two</p></blockquote>'

      expect(await transform(value)).toBe(expected)
    })

    it('should process <li> as a loose container', async () => {
      const value = '<ul><li>One<br><br>Two</li></ul>'
      const expected = '<ul><li><p>One</p><p>Two</p></li></ul>'

      expect(await transform(value)).toBe(expected)
    })

    it('should process <td> as a loose container', async () => {
      const value = '<table><tr><td>One<br><br>Two</td></tr></table>'

      expect(await transform(value)).toContain('<td><p>One</p><p>Two</p></td>')
    })

    it('should process nested loose containers independently', async () => {
      const value = '<article><p>Existing</p><div>Inline<br><br>More inline</div></article>'
      const expected =
        '<article><p>Existing</p><div><p>Inline</p><p>More inline</p></div></article>'

      expect(await transform(value)).toBe(expected)
    })

    it('should normalize self-closing <br/> variants', async () => {
      const value = '<div>One<br/><br/>Two</div>'
      const expected = '<div><p>One</p><p>Two</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should recognize <br> with attributes', async () => {
      const value = '<div>One<br class="x"><br id="y">Two</div>'
      const expected = '<div><p>One</p><p>Two</p></div>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should not wrap chunks containing block elements', async () => {
      const value = '<div>Text<br><br><div>Block</div><br><br>More text</div>'
      const expected = '<div><p>Text</p><div>Block</div><p>More text</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should not wrap chunk containing block-void <hr>', async () => {
      const value = '<div>Text<br><br><hr><br><br>More</div>'
      const expected = '<div><p>Text</p><hr><p>More</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should drop leading <br><br>', async () => {
      const value = '<div><br><br>Text</div>'
      const expected = '<div><p>Text</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should drop trailing <br><br>', async () => {
      const value = '<div>Text<br><br></div>'
      const expected = '<div><p>Text</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should skip whitespace-only chunks', async () => {
      const value = '<div>Text<br><br>   <br><br>More</div>'
      const expected = '<div><p>Text</p><p>More</p></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should not collapse <br> separated by an inline element', async () => {
      const value = '<div>One<br><span>x</span><br>Two</div>'

      expect(await transform(value)).toBe(value)
    })

    it('should not collapse <br> separated by a comment', async () => {
      const value = '<div>One<br><!--gap--><br>Two</div>'

      expect(await transform(value)).toBe(value)
    })

    it('should not touch <br><br> inside <pre>', async () => {
      const value = '<pre>code line 1<br><br>code line 2</pre>'

      expect(await transform(value)).toBe(value)
    })

    it('should not touch <br><br> inside <code>', async () => {
      const value = '<code>line 1<br><br>line 2</code>'

      expect(await transform(value)).toBe(value)
    })

    it('should not touch a loose container nested inside <pre>', async () => {
      const value = '<pre><div>a<br><br>b</div></pre>'

      expect(await transform(value)).toBe(value)
    })

    it('should empty a container with only <br>s', async () => {
      const value = '<div><br><br><br></div>'
      const expected = '<div></div>'

      expect(await transform(value)).toBe(expected)
    })

    it('should be idempotent', async () => {
      const value = '<div>First<br><br>Second<br><br>Third</div>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })

    it('should leave content alone when no <br><br> is present', async () => {
      const value = '<div>Just some text</div>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave single <br> alone', async () => {
      const value = '<div>First<br>Second</div>'

      expect(await transform(value)).toBe(value)
    })

    it('should handle empty container', async () => {
      const value = '<div></div>'

      expect(await transform(value)).toBe(value)
    })
  })
})
