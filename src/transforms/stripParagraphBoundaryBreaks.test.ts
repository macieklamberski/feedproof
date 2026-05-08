import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { stripParagraphBoundaryBreaks } from './stripParagraphBoundaryBreaks.js'

const context: TransformContext = {}

describe('stripParagraphBoundaryBreaks', () => {
  it('should remove leading br', () => {
    const html = '<p><br>Text</p>'
    const result = transformHtml(html, stripParagraphBoundaryBreaks(context))

    expect(result).toBe('<p>Text</p>')
  })

  it('should remove trailing br', () => {
    const html = '<p>Text<br></p>'
    const result = transformHtml(html, stripParagraphBoundaryBreaks(context))

    expect(result).toBe('<p>Text</p>')
  })

  it('should remove both leading and trailing br', () => {
    const html = '<p><br>Text<br></p>'
    const result = transformHtml(html, stripParagraphBoundaryBreaks(context))

    expect(result).toBe('<p>Text</p>')
  })

  it('should remove multiple consecutive boundary br', () => {
    const html = '<p><br><br>Text<br><br></p>'
    const result = transformHtml(html, stripParagraphBoundaryBreaks(context))

    expect(result).toBe('<p>Text</p>')
  })

  it('should remove whitespace text nodes alongside br', () => {
    const html = '<p> <br>Text<br> </p>'
    const result = transformHtml(html, stripParagraphBoundaryBreaks(context))

    expect(result).toBe('<p>Text</p>')
  })

  it('should preserve interior br', () => {
    const html = '<p>Line one<br>Line two</p>'
    const result = transformHtml(html, stripParagraphBoundaryBreaks(context))

    expect(result).toBe('<p>Line one<br>Line two</p>')
  })

  it('should not modify content without br', () => {
    const html = '<p>Just text</p>'
    const result = transformHtml(html, stripParagraphBoundaryBreaks(context))

    expect(result).toBe('<p>Just text</p>')
  })

  it('should empty paragraph with only br content', () => {
    const html = '<p><br></p>'
    const result = transformHtml(html, stripParagraphBoundaryBreaks(context))

    expect(result).toBe('<p></p>')
  })

  it('should not affect br outside paragraphs', () => {
    const html = '<p>Text</p><br><div>Block</div>'
    const result = transformHtml(html, stripParagraphBoundaryBreaks(context))

    expect(result).toBe('<p>Text</p><br><div>Block</div>')
  })

  it('should handle multiple paragraphs independently', () => {
    const html = '<p><br>First<br></p><p><br>Second<br></p>'
    const result = transformHtml(html, stripParagraphBoundaryBreaks(context))

    expect(result).toBe('<p>First</p><p>Second</p>')
  })
})
