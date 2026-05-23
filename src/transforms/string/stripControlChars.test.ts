import { describe, expect, it } from 'bun:test'
import { baseContext } from '../../tests.js'
import { stripControlChars } from './stripControlChars.js'

describe('stripControlChars', () => {
  const transform = stripControlChars(baseContext)

  it('should strip NUL byte', () => {
    expect(transform('<p>before\x00after</p>')).toBe('<p>beforeafter</p>')
  })

  it('should strip BEL', () => {
    expect(transform('<p>before\x07after</p>')).toBe('<p>beforeafter</p>')
  })

  it('should strip BS', () => {
    expect(transform('<p>before\x08after</p>')).toBe('<p>beforeafter</p>')
  })

  it('should strip VT (U+000B)', () => {
    expect(transform('<p>before\x0bafter</p>')).toBe('<p>beforeafter</p>')
  })

  it('should strip FF (U+000C)', () => {
    expect(transform('<p>before\x0cafter</p>')).toBe('<p>beforeafter</p>')
  })

  it('should strip U+001F (US)', () => {
    expect(transform('<p>before\x1fafter</p>')).toBe('<p>beforeafter</p>')
  })

  it('should strip DEL (U+007F)', () => {
    expect(transform('<p>before\x7fafter</p>')).toBe('<p>beforeafter</p>')
  })

  it('should strip C1 control range (U+0080-U+009F)', () => {
    expect(transform('<p>before\x85\x9fafter</p>')).toBe('<p>beforeafter</p>')
  })

  it('should preserve tab (U+0009)', () => {
    const value = '<p>tab\there</p>'

    expect(transform(value)).toBe(value)
  })

  it('should preserve LF (U+000A)', () => {
    const value = '<p>line1\nline2</p>'

    expect(transform(value)).toBe(value)
  })

  it('should preserve CR (U+000D)', () => {
    const value = '<p>line1\rline2</p>'

    expect(transform(value)).toBe(value)
  })

  it('should preserve space and printable ASCII', () => {
    const value = '<p>hello world!</p>'

    expect(transform(value)).toBe(value)
  })

  it('should preserve real Unicode content (emoji, CJK, accented Latin)', () => {
    const value = '<p>café 你好 😉</p>'

    expect(transform(value)).toBe(value)
  })

  it('should strip multiple invalid chars in a single run', () => {
    expect(transform('a\x00b\x07c\x0bd\x7fe')).toBe('abcde')
  })

  it('should strip invalid chars spanning multiple lines', () => {
    expect(transform('line1\x00\n\rline2\x07\nline3')).toBe('line1\n\rline2\nline3')
  })

  it('should be a no-op on clean text', () => {
    const value = '<article><h1>Title</h1><p>Body with <em>emphasis</em>.</p></article>'

    expect(transform(value)).toBe(value)
  })

  it('should be idempotent', async () => {
    const value = '<p>before\x00\x07after</p>'

    expect(await transform(await transform(value))).toBe(await transform(value))
  })

  it('should handle empty input', () => {
    expect(transform('')).toBe('')
  })
})
