import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { stripLeadingIndentation } from './stripLeadingIndentation.js'

describeForEachParser('stripLeadingIndentation', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripLeadingIndentation(context)])
  }

  const noop = (html: string) => {
    return applyDomTransforms(parseHtml(html), [() => {}])
  }

  it('should strip a leading nbsp run from a paragraph', async () => {
    const value = '<p>&nbsp;&nbsp;&nbsp;Lorem ipsum</p>'
    const result = await transform(value)

    expect(result).toContain('<p>Lorem ipsum</p>')
  })

  it('should strip a leading run inside an inline wrapper', async () => {
    const value = '<p><span>&nbsp;&nbsp;Lorem ipsum</span></p>'
    const result = await transform(value)

    expect(result).toContain('<p><span>Lorem ipsum</span></p>')
  })

  it('should strip a run mixing nbsp and regular spaces', async () => {
    const value = '<p>&nbsp; &nbsp; &nbsp;Lorem ipsum</p>'
    const result = await transform(value)

    expect(result).toContain('<p>Lorem ipsum</p>')
  })

  it('should strip other fixed-width spaces (em space, ideographic space)', async () => {
    const value = '<p>&emsp;&#12288;Lorem ipsum</p>'
    const result = await transform(value)

    expect(result).toContain('<p>Lorem ipsum</p>')
  })

  it('should apply to divs, headings, list items, blockquotes and definitions', async () => {
    expect(await transform('<div>&nbsp;&nbsp;Block</div>')).toContain('<div>Block</div>')
    expect(await transform('<h2>&nbsp;&nbsp;Title</h2>')).toContain('<h2>Title</h2>')
    expect(await transform('<li>&nbsp;Item</li>')).toContain('<li>Item</li>')
    expect(await transform('<blockquote>&nbsp;Quote</blockquote>')).toContain(
      '<blockquote>Quote</blockquote>',
    )
    expect(await transform('<dd>&nbsp;Definition</dd>')).toContain('<dd>Definition</dd>')
  })

  it('should not cross a nested block when a div wraps child blocks', async () => {
    const value = '<div><p>&nbsp;&nbsp;Lorem ipsum</p></div>'
    const result = await transform(value)

    expect(result).toContain('<div><p>Lorem ipsum</p></div>')
  })

  it('should leave purely collapsible leading whitespace untouched', async () => {
    const value = '<p>   \n\tLorem ipsum</p>'
    const result = await transform(value)

    expect(result).toBe(await noop(value))
  })

  it('should preserve non-leading nbsp', async () => {
    const value = '<p>Lorem&nbsp;ipsum</p>'
    const result = await transform(value)

    expect(result).toBe(await noop(value))
  })

  it('should not strip when a leading void element precedes the text', async () => {
    const value = '<p><img src="x.png">&nbsp;Lorem ipsum</p>'
    const result = await transform(value)

    expect(result).toBe(await noop(value))
  })

  it('should handle a nested block once without crossing its boundary', async () => {
    const value = '<blockquote><p>&nbsp;&nbsp;Lorem ipsum</p></blockquote>'
    const result = await transform(value)

    expect(result).toContain('<blockquote><p>Lorem ipsum</p></blockquote>')
  })

  it('should leave a paragraph without leading whitespace unchanged', async () => {
    const value = '<p>Lorem ipsum</p>'
    const result = await transform(value)

    expect(result).toBe(await noop(value))
  })

  it('should be idempotent', async () => {
    const value = '<p>&nbsp;&nbsp;Lorem ipsum</p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
