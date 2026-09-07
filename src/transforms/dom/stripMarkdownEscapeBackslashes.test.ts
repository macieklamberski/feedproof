import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { stripMarkdownEscapeBackslashes } from './stripMarkdownEscapeBackslashes.js'

describeForEachParser('stripMarkdownEscapeBackslashes', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [stripMarkdownEscapeBackslashes(context)])
  }

  it('should empty a lone-backslash paragraph', async () => {
    const value = '<p>\\</p>'
    const expected = '<p></p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should strip a backslash at the start of a paragraph', async () => {
    const value = '<p>\\ Is the Trump administration…</p>'
    const expected = '<p> Is the Trump administration…</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should strip a leading backslash after leading whitespace', async () => {
    const value = '<p>  \\ text</p>'
    const expected = '<p>   text</p>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not touch a leading backslash followed by a non-space', async () => {
    const value = '<p>\\(x^2\\) is math</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not touch a leading double backslash', async () => {
    const value = '<p>\\\\ literal</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not touch a backslash mid-paragraph', async () => {
    const value = '<p>a path C:\\Users ends here</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a backslash before a br alone (Windows paths, continuations)', async () => {
    const value = '<p>C:\\Users\\admin\\RSA\\<br />next</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not touch a leading backslash in non-paragraph blocks like div', async () => {
    const value = '<div>\\ text</div>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should handle empty input', async () => {
    expect(await transform('')).toEqualHtml('')
  })

  it('should be idempotent', async () => {
    const value = '<p>\\</p><p>\\ lead</p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
