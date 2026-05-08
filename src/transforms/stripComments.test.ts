import { describe, expect, it } from 'bun:test'
import type { TransformContext } from '../types.js'
import { stripComments } from './stripComments.js'

const context: TransformContext = {}

describe('stripComments', () => {
  const strip = stripComments(context)

  it('should remove a single comment', () => {
    expect(strip('<!-- hidden -->')).toBe('')
  })

  it('should remove multiple comments', () => {
    const value = '<!-- one --><p>text</p><!-- two -->'
    const expected = '<p>text</p>'

    expect(strip(value)).toBe(expected)
  })

  it('should remove a comment between elements', () => {
    const value = '<p>First</p><!-- separator --><p>Second</p>'
    const expected = '<p>First</p><p>Second</p>'

    expect(strip(value)).toBe(expected)
  })

  it('should remove a comment containing newlines', () => {
    const value = '<p>before</p><!--\n  multiline\n  body\n--><p>after</p>'
    const expected = '<p>before</p><p>after</p>'

    expect(strip(value)).toBe(expected)
  })

  it('should remove a conditional comment', () => {
    const value = '<!--[if IE]><p>legacy</p><![endif]--><p>main</p>'
    const expected = '<p>main</p>'

    expect(strip(value)).toBe(expected)
  })

  it('should remove a comment inside a paragraph', () => {
    const value = '<p>Hello <!-- inline --> world</p>'
    const expected = '<p>Hello  world</p>'

    expect(strip(value)).toBe(expected)
  })

  it('should leave content unchanged when there are no comments', () => {
    const value = '<p>Plain content with no comments</p>'

    expect(strip(value)).toBe(value)
  })

  it('should leave entity-encoded comment text unchanged', () => {
    const value = '<p>Use &lt;!-- comment --&gt; in HTML</p>'

    expect(strip(value)).toBe(value)
  })

  it('should leave an unterminated comment unchanged', () => {
    const value = '<p>before</p><!-- unterminated'

    expect(strip(value)).toBe(value)
  })

  it('should leave doctype declarations unchanged', () => {
    const value = '<!DOCTYPE html><p>content</p>'

    expect(strip(value)).toBe(value)
  })

  it('should handle empty string', () => {
    expect(strip('')).toBe('')
  })
})
