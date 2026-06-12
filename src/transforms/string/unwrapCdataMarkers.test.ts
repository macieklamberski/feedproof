import { describe, expect, it } from 'bun:test'
import { baseContext } from '../../tests.js'
import { unwrapCdataMarkers } from './unwrapCdataMarkers.js'

describe('unwrapCdataMarkers', () => {
  const transform = unwrapCdataMarkers(baseContext)

  it('should unwrap a whole-value CDATA wrapper', () => {
    expect(transform('<![CDATA[<p>article</p>]]>')).toBe('<p>article</p>')
  })

  it('should unwrap a plain-text whole-value wrapper', () => {
    expect(transform('<![CDATA[Some summary text]]>')).toBe('Some summary text')
  })

  it('should unwrap when surrounded only by whitespace', () => {
    expect(transform('\n  <![CDATA[<p>body</p>]]>\n')).toBe('<p>body</p>')
  })

  it('should preserve whitespace inside the wrapper', () => {
    expect(transform('<![CDATA[ <p>body</p> ]]>')).toBe(' <p>body</p> ')
  })

  it('should leave a mid-content marker alone', () => {
    const value = 'Here is an example: <![CDATA[raw text]]> in XML.'

    expect(transform(value)).toBe(value)
  })

  it('should leave a wrapper that does not span the whole value alone', () => {
    const value = '<![CDATA[Lead paragraph]]><p>more</p>'

    expect(transform(value)).toBe(value)
  })

  it('should leave multiple blocks alone', () => {
    const value = '<![CDATA[first part]]>middle<![CDATA[last part]]>'

    expect(transform(value)).toBe(value)
  })

  it('should leave an unterminated marker alone', () => {
    const value = '<![CDATA[unterminated'

    expect(transform(value)).toBe(value)
  })

  it('should leave content without markers alone', () => {
    const value = '<p>plain content</p>'

    expect(transform(value)).toBe(value)
  })

  it('should handle an empty wrapper', () => {
    expect(transform('<![CDATA[]]>')).toBe('')
  })

  it('should handle empty input', () => {
    expect(transform('')).toBe('')
  })

  it('should be idempotent on already-unwrapped content', async () => {
    expect(await transform(await transform('<![CDATA[<p>body</p>]]>'))).toBe('<p>body</p>')
  })
})
