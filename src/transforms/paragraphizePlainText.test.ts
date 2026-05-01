import { describe, expect, it } from 'bun:test'
import type { TransformContext } from '../types.js'
import { paragraphizePlainText } from './paragraphizePlainText.js'

const context: TransformContext = {}

describe('paragraphizePlainText', () => {
  const paragraphize = paragraphizePlainText(context)

  it('should wrap plain text in paragraph tags', () => {
    const result = paragraphize('Hello world')

    expect(result).toContain('<p>Hello world</p>')
  })

  it('should wrap multiple paragraphs separated by double newlines', () => {
    const result = paragraphize('First paragraph\n\nSecond paragraph')

    expect(result).toContain('<p>First paragraph</p>')
    expect(result).toContain('<p>Second paragraph</p>')
  })

  it('should convert single newlines to line breaks', () => {
    const result = paragraphize('Line one\nLine two')

    expect(result).toContain('<br')
  })

  it('should not modify content that already has HTML', () => {
    const value = '<p>Already HTML</p>\n\nMore text'
    const result = paragraphize(value)

    expect(result).toBe(value)
  })

  it('should not modify content with block-level HTML', () => {
    const value = '<div>Content</div>'
    const result = paragraphize(value)

    expect(result).toBe(value)
  })

  it('should not modify content with self-closing HTML', () => {
    const value = '<img src="photo.jpg">'
    const result = paragraphize(value)

    expect(result).toBe(value)
  })

  it('should handle empty string', () => {
    const result = paragraphize('')

    expect(result).toBe('')
  })
})
