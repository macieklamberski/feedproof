import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { convertBreaksToParagraphs } from './convertBreaksToParagraphs.js'

const context: TransformContext = {}

describe('convertBreaksToParagraphs', () => {
  it('should convert <br><br> separated text into paragraphs', () => {
    const html = '<div>First text<br><br>Second text<br><br>Third text</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>First text</p>')
    expect(result).toContain('<p>Second text</p>')
    expect(result).toContain('<p>Third text</p>')
  })

  it('should handle 3 or more consecutive <br> as a single break', () => {
    const html = '<div>First<br><br><br><br>Second</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>First</p>')
    expect(result).toContain('<p>Second</p>')
  })

  it('should preserve single <br> within a paragraph', () => {
    const html = '<div>Line one<br>Line two<br><br>New paragraph</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>Line one<br>Line two</p>')
    expect(result).toContain('<p>New paragraph</p>')
  })

  it('should treat whitespace between <br> tags as part of the run', () => {
    const html = '<div>First<br>\n  <br>Second</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>First</p>')
    expect(result).toContain('<p>Second</p>')
  })

  it('should preserve inline elements within paragraphs', () => {
    const html = '<div>Hello <strong>world</strong><br><br>How are you?</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>Hello <strong>world</strong></p>')
    expect(result).toContain('<p>How are you?</p>')
  })

  it('should not wrap chunks containing block elements', () => {
    const html = '<div>Text<br><br><div>Block</div><br><br>More text</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>Text</p>')
    expect(result).toContain('<div>Block</div>')
    expect(result).toContain('<p>More text</p>')
  })

  it('should not produce nested <p> tags', () => {
    const html = '<div>Text<br><br>More</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).not.toContain('<p><p>')
    expect(result).not.toContain('</p></p>')
  })

  it('should leave content alone when no <br><br> is present', () => {
    const html = '<div>Just some text</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toBe('<div>Just some text</div>')
  })

  it('should leave content with single <br> alone', () => {
    const html = '<div>First<br>Second</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toBe('<div>First<br>Second</div>')
  })

  it('should drop leading <br><br>', () => {
    const html = '<div><br><br>Text</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>Text</p>')
    expect(result).not.toContain('<br>')
  })

  it('should drop trailing <br><br>', () => {
    const html = '<div>Text<br><br></div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>Text</p>')
    expect(result).not.toContain('<br>')
  })

  it('should not touch <br><br> inside <pre>', () => {
    const html = '<pre>code line 1<br><br>code line 2</pre>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toBe('<pre>code line 1<br><br>code line 2</pre>')
  })

  it('should not touch <br><br> inside <code>', () => {
    const html = '<code>line 1<br><br>line 2</code>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('line 1<br><br>line 2')
  })

  it('should process nested loose containers', () => {
    const html = '<article><p>Existing</p><div>Inline<br><br>More inline</div></article>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>Existing</p>')
    expect(result).toContain('<p>Inline</p>')
    expect(result).toContain('<p>More inline</p>')
  })

  it('should handle <blockquote> as a loose container', () => {
    const html = '<blockquote>One<br><br>Two</blockquote>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>One</p>')
    expect(result).toContain('<p>Two</p>')
  })

  it('should handle <li> as a loose container', () => {
    const html = '<ul><li>One<br><br>Two</li></ul>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>One</p>')
    expect(result).toContain('<p>Two</p>')
  })

  it('should handle <td> as a loose container', () => {
    const html = '<table><tr><td>One<br><br>Two</td></tr></table>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>One</p>')
    expect(result).toContain('<p>Two</p>')
  })

  it('should handle empty container', () => {
    const html = '<div></div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toBe('<div></div>')
  })

  it('should handle a chunk that is only whitespace by skipping it', () => {
    const html = '<div>Text<br><br>   <br><br>More</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>Text</p>')
    expect(result).toContain('<p>More</p>')
  })

  it('should preserve mixed inline content with images', () => {
    const html = '<div>Caption text<br><br><img src="x.jpg" alt="photo"></div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>Caption text</p>')
    expect(result).toContain('<p><img src="x.jpg" alt="photo"></p>')
  })

  it('should be idempotent', () => {
    const html = '<div>First<br><br>Second<br><br>Third</div>'
    const once = transformHtml(html, convertBreaksToParagraphs(context))
    const twice = transformHtml(once, convertBreaksToParagraphs(context))

    expect(twice).toBe(once)
  })

  it('should empty a container that contains only <br><br>', () => {
    const html = '<div><br><br><br></div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toBe('<div></div>')
  })

  it('should not collapse <br> separated by an inline element', () => {
    const html = '<div>One<br><span>x</span><br>Two</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toBe('<div>One<br><span>x</span><br>Two</div>')
  })

  it('should not collapse <br> separated by a comment', () => {
    const html = '<div>One<br><!--gap--><br>Two</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<!--gap-->')
    expect(result).not.toContain('<p>')
  })

  it('should preserve existing <p> tags interleaved with <br><br>', () => {
    const html = '<div>Lead-in<br><br><p>Existing</p><br><br>Tail</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>Lead-in</p>')
    expect(result).toContain('<p>Existing</p>')
    expect(result).toContain('<p>Tail</p>')
    expect(result).not.toContain('<p><p>')
  })

  it('should not wrap chunk containing block-void element <hr>', () => {
    const html = '<div>Text<br><br><hr><br><br>More</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>Text</p>')
    expect(result).toContain('<hr>')
    expect(result).toContain('<p>More</p>')
    expect(result).not.toContain('<p><hr>')
  })

  it('should recognize <br> with attributes', () => {
    const html = '<div>One<br class="x"><br id="y">Two</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>One</p>')
    expect(result).toContain('<p>Two</p>')
  })

  it('should normalize self-closing <br/> variants', () => {
    const html = '<div>One<br/><br/>Two</div>'
    const result = transformHtml(html, convertBreaksToParagraphs(context))

    expect(result).toContain('<p>One</p>')
    expect(result).toContain('<p>Two</p>')
  })
})
