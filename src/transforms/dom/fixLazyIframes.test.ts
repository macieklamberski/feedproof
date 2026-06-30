import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { fixLazyIframes } from './fixLazyIframes.js'

describeForEachParser('fixLazyIframes', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [fixLazyIframes(context)])
  }

  it('should promote a lazy data-src into src', async () => {
    const value = '<iframe src="about:blank" data-src="https://example.com/embed/x"></iframe>'
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/embed/x"')
  })

  it('should promote a lazy data-orig into an iframe with no src', async () => {
    const value = '<iframe id="_ytid_27860" data-orig="https://www.youtube.com/embed/x"></iframe>'
    const result = await transform(value)

    expect(result).toContain('src="https://www.youtube.com/embed/x"')
  })

  it('should promote a consent-gated src into an empty src', async () => {
    const value = '<iframe src="" data-cookieblock-src="https://example.com/embed/x"></iframe>'
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/embed/x"')
  })

  it('should not overwrite a usable src', async () => {
    const value =
      '<iframe src="https://example.com/real" data-src="https://example.com/lazy"></iframe>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave an empty iframe with no recoverable attribute', async () => {
    const value = '<iframe src="about:blank"></iframe>'
    const result = await transform(value)

    expect(result).toContain('about:blank')
  })

  it('should ignore flag-style values that are not URL-shaped', async () => {
    const value = '<iframe src="about:blank" data-src="loaded"></iframe>'
    const result = await transform(value)

    expect(result).toContain('about:blank')
  })

  it('should be idempotent', async () => {
    const value = '<iframe src="about:blank" data-src="https://example.com/embed/x"></iframe>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
