import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { stripInterBlockBreaks } from './stripInterBlockBreaks.js'

const context: TransformContext = {}

describe('stripInterBlockBreaks', () => {
  it('should remove br between two block elements', () => {
    const html = '<p>First</p><br><p>Second</p>'
    const result = transformHtml(html, stripInterBlockBreaks(context))

    expect(result).not.toContain('<br>')
    expect(result).toContain('<p>First</p>')
    expect(result).toContain('<p>Second</p>')
  })

  it('should remove multiple consecutive br between blocks', () => {
    const html = '<p>First</p><br><br><br><p>Second</p>'
    const result = transformHtml(html, stripInterBlockBreaks(context))

    expect(result).not.toContain('<br>')
  })

  it('should remove br before first block element', () => {
    const html = '<br><p>Content</p>'
    const result = transformHtml(html, stripInterBlockBreaks(context))

    expect(result).not.toContain('<br>')
    expect(result).toContain('<p>Content</p>')
  })

  it('should remove br after last block element', () => {
    const html = '<p>Content</p><br>'
    const result = transformHtml(html, stripInterBlockBreaks(context))

    expect(result).not.toContain('<br>')
    expect(result).toContain('<p>Content</p>')
  })

  it('should preserve br inside inline context', () => {
    const html = '<p>Line one<br>Line two</p>'
    const result = transformHtml(html, stripInterBlockBreaks(context))

    expect(result).toContain('<br>')
  })

  it('should preserve br between inline elements at top level', () => {
    const html = '<span>One</span><br><span>Two</span>'
    const result = transformHtml(html, stripInterBlockBreaks(context))

    expect(result).toContain('<br>')
  })

  it('should remove br with whitespace text nodes between blocks', () => {
    const html = '<p>First</p>\n  <br>\n  <p>Second</p>'
    const result = transformHtml(html, stripInterBlockBreaks(context))

    expect(result).not.toContain('<br>')
  })

  it('should remove br between different block elements', () => {
    const html = '<p>Text</p><br><blockquote>Quote</blockquote>'
    const result = transformHtml(html, stripInterBlockBreaks(context))

    expect(result).not.toContain('<br>')
  })

  it('should not modify content without br', () => {
    const html = '<p>First</p><p>Second</p>'
    const result = transformHtml(html, stripInterBlockBreaks(context))

    expect(result).toContain('<p>First</p>')
    expect(result).toContain('<p>Second</p>')
  })
})
