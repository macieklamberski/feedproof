import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripLeadingIndentation } from './stripLeadingIndentation.js'

describeForEachParser('stripLeadingIndentation', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [stripLeadingIndentation(context)])
  }

  it('should strip a leading nbsp run from a paragraph', async () => {
    const value = '<p>&nbsp;&nbsp;&nbsp;Lorem ipsum</p>'
    const expected = '<p>Lorem ipsum</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should strip a leading run inside an inline wrapper', async () => {
    const value = '<p><span>&nbsp;&nbsp;Lorem ipsum</span></p>'
    const expected = '<p><span>Lorem ipsum</span></p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should strip a run mixing nbsp and regular spaces', async () => {
    const value = '<p>&nbsp; &nbsp; &nbsp;Lorem ipsum</p>'
    const expected = '<p>Lorem ipsum</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should strip other fixed-width spaces (em space, ideographic space)', async () => {
    const value = '<p>&emsp;&#12288;Lorem ipsum</p>'
    const expected = '<p>Lorem ipsum</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  const blockCases: Array<[string, string]> = [
    ['<div>&nbsp;&nbsp;Block</div>', '<div>Block</div>'],
    ['<h2>&nbsp;&nbsp;Title</h2>', '<h2>Title</h2>'],
    ['<li>&nbsp;Item</li>', '<li>Item</li>'],
    ['<blockquote>&nbsp;Quote</blockquote>', '<blockquote>Quote</blockquote>'],
    ['<dd>&nbsp;Definition</dd>', '<dd>Definition</dd>'],
  ]

  it.each(blockCases)('should strip the leading run from %s', async (value, expected) => {
    expect(await transform(value)).toBe(expected)
  })

  it('should not cross a nested block when a div wraps child blocks', async () => {
    const value = '<div><p>&nbsp;&nbsp;Lorem ipsum</p></div>'
    const expected = '<div><p>Lorem ipsum</p></div>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave purely collapsible leading whitespace untouched', async () => {
    const value = '<p>   \n\tLorem ipsum</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve non-leading nbsp', async () => {
    const value = '<p>Lorem&nbsp;ipsum</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not strip when a leading void element precedes the text', async () => {
    const value = '<p><img src="x.png">&nbsp;Lorem ipsum</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should handle a nested block once without crossing its boundary', async () => {
    const value = '<blockquote><p>&nbsp;&nbsp;Lorem ipsum</p></blockquote>'
    const expected = '<blockquote><p>Lorem ipsum</p></blockquote>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave a paragraph without leading whitespace unchanged', async () => {
    const value = '<p>Lorem ipsum</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should strip the whole run from an all-whitespace block', async () => {
    const value = '<p>&nbsp;&nbsp;</p>'
    const expected = '<p></p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should handle empty input', async () => {
    expect(await transform('')).toBe('')
  })

  it('should be idempotent', async () => {
    const value = '<p>&nbsp;&nbsp;Lorem ipsum</p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
