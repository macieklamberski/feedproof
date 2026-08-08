import { expect, it } from 'bun:test'
import { defaultLazyIframeAttributes } from '../../defaults.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { fixLazyIframes } from './fixLazyIframes.js'

describeForEachParser('fixLazyIframes', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [fixLazyIframes(context)])
  }

  // Iterates the real default list, so every entry is exercised and a new entry
  // is covered automatically.
  it.each(defaultLazyIframeAttributes)('should promote %s into src', async (attribute) => {
    const value = `<iframe src="" ${attribute}="https://example.com/embed/x"></iframe>`
    const expected = `<iframe src="https://example.com/embed/x" ${attribute}="https://example.com/embed/x"></iframe>`

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should promote a lazy attribute into an iframe with no src', async () => {
    const value = '<iframe id="_ytid_27860" data-orig="https://www.youtube.com/embed/x"></iframe>'
    const result = await transform(value)

    expect(result).toContain('src="https://www.youtube.com/embed/x"')
  })

  it('should not promote a consent-gated attribute', async () => {
    const value = '<iframe src="" data-cookieblock-src="https://example.com/embed/x"></iframe>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should promote over the Invision interface placeholder src', async () => {
    const value =
      '<iframe src="https://forum.example.com/applications/core/interface/index.html" data-embed-src="https://www.youtube.com/embed/x?feature=oembed"></iframe>'
    const result = await transform(value)

    expect(result).toContain('src="https://www.youtube.com/embed/x?feature=oembed"')
  })

  it('should leave the Invision placeholder src when nothing is parked', async () => {
    const value =
      '<iframe src="https://forum.example.com/applications/core/interface/index.html"></iframe>'

    expect(await transform(value)).toEqualHtml(value)
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
