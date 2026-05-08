import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { stripInterBlockBreaks } from './stripInterBlockBreaks.js'

const context: TransformContext = {}

describe('stripInterBlockBreaks', () => {
  it('should remove br between two block elements', () => {
    const value = '<p>First</p><br><p>Second</p>'
    const expected = '<p>First</p><p>Second</p>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(expected)
  })

  it('should remove multiple consecutive br between blocks', () => {
    const value = '<p>First</p><br><br><br><p>Second</p>'
    const expected = '<p>First</p><p>Second</p>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(expected)
  })

  it('should remove br before first block element', () => {
    const value = '<br><p>Content</p>'
    const expected = '<p>Content</p>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(expected)
  })

  it('should remove br after last block element', () => {
    const value = '<p>Content</p><br>'
    const expected = '<p>Content</p>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(expected)
  })

  it('should preserve br inside inline context', () => {
    const value = '<p>Line one<br>Line two</p>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(value)
  })

  it('should preserve br between inline elements at top level', () => {
    const value = '<span>One</span><br><span>Two</span>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(value)
  })

  it('should remove br with whitespace text nodes between blocks', () => {
    const value = '<p>First</p>\n  <br>\n  <p>Second</p>'
    const expected = '<p>First</p>\n  \n  <p>Second</p>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(expected)
  })

  it('should remove br between different block elements', () => {
    const value = '<p>Text</p><br><blockquote>Quote</blockquote>'
    const expected = '<p>Text</p><blockquote>Quote</blockquote>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(expected)
  })

  it('should not modify content without br', () => {
    const value = '<p>First</p><p>Second</p>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(value)
  })

  it('should remove br between blocks separated by comments', () => {
    const value = '<p>First</p><!--x--><br><!--y--><p>Second</p>'
    const expected = '<p>First</p><!--x--><!--y--><p>Second</p>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(expected)
  })

  it('should remove br before first block when preceded by a comment', () => {
    const value = '<!--x--><br><p>Content</p>'
    const expected = '<!--x--><p>Content</p>'

    expect(transformHtml(value, stripInterBlockBreaks(context))).toBe(expected)
  })
})
