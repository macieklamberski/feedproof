import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { stripInterBlockBreaks } from './stripInterBlockBreaks.js'

describeForEachParser('stripInterBlockBreaks', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripInterBlockBreaks(context)])
  }

  it('should remove br between two block elements', async () => {
    const value = html`
      <p>First</p>
      <br>
      <p>Second</p>
    `
    const expected = html`
      <p>First</p>
      <p>Second</p>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should remove multiple consecutive br between blocks', async () => {
    const value = html`
      <p>First</p>
      <br>
      <br>
      <br>
      <p>Second</p>
    `
    const expected = html`
      <p>First</p>
      <p>Second</p>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should remove br before first block element', async () => {
    const value = html`
      <br>
      <p>Content</p>
    `
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should remove br after last block element', async () => {
    const value = html`
      <p>Content</p>
      <br>
    `
    const expected = '<p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve br inside inline context', async () => {
    const value = '<p>Line one<br>Line two</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve br between inline elements at top level', async () => {
    const value = html`
      <span>One</span>
      <br>
      <span>Two</span>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should preserve br between a block and following bare text', async () => {
    const value = '<p>First</p><br>trailing text'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve br between bare text and a following block', async () => {
    const value = 'leading text<br><p>Second</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should remove br with whitespace text nodes between blocks', async () => {
    const value = '<p>First</p>\n  <br>\n  <p>Second</p>'
    const expected = '<p>First</p>\n  \n  <p>Second</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should remove br between different block elements', async () => {
    const value = html`
      <p>Text</p>
      <br>
      <blockquote>Quote</blockquote>
    `
    const expected = html`
      <p>Text</p>
      <blockquote>Quote</blockquote>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should remove br between a bare image and a following block', async () => {
    const value = '<img src="https://example.com/p.jpg"><br><blockquote>Quote</blockquote>'
    const expected = '<img src="https://example.com/p.jpg"><blockquote>Quote</blockquote>'

    expect(await transform(value)).toBe(expected)
  })

  it('should remove br between a block and a following bare image', async () => {
    const value = '<p>Text</p><br><img src="https://example.com/p.jpg">'
    const expected = '<p>Text</p><img src="https://example.com/p.jpg">'

    expect(await transform(value)).toBe(expected)
  })

  it('should remove br between two bare images', async () => {
    const value = '<img src="https://example.com/a.jpg"><br><img src="https://example.com/b.jpg">'
    const expected = '<img src="https://example.com/a.jpg"><img src="https://example.com/b.jpg">'

    expect(await transform(value)).toBe(expected)
  })

  it('should remove br before a leading bare image', async () => {
    const value = '<br><img src="https://example.com/p.jpg">'
    const expected = '<img src="https://example.com/p.jpg">'

    expect(await transform(value)).toBe(expected)
  })

  it('should remove br between a bare video and a following block', async () => {
    const value = '<video src="https://example.com/c.mp4"></video><br><p>Text</p>'
    const expected = '<video src="https://example.com/c.mp4"></video><p>Text</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve br between bare text and a following image', async () => {
    const value = 'leading text<br><img src="https://example.com/p.jpg">'

    expect(await transform(value)).toBe(value)
  })

  it('should not modify content without br', async () => {
    const value = html`
      <p>First</p>
      <p>Second</p>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should remove br between blocks separated by comments', async () => {
    const value = html`
      <p>First</p>
      <!--x-->
      <br>
      <!--y-->
      <p>Second</p>
    `
    const expected = html`
      <p>First</p>
      <!--x-->
      <!--y-->
      <p>Second</p>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should remove br before first block when preceded by a comment', async () => {
    const value = html`
      <!--x-->
      <br>
      <p>Content</p>
    `
    const expected = '<!--x--><p>Content</p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should handle empty input', async () => {
    expect(await transform('')).toBe('')
  })

  it('should be idempotent', async () => {
    const value = html`
      <p>First</p>
      <br>
      <p>Second</p>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
