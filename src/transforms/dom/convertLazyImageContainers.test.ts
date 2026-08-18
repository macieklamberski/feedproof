import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertLazyImageContainers } from './convertLazyImageContainers.js'

describeForEachParser('convertLazyImageContainers', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [convertLazyImageContainers(context)])
  }

  it('should convert a media-less div carrying an image-shaped lazy src into an img', async () => {
    const value = '<div class="cesis_gallery_img" data-src="https://example.com/photo.jpg"></div>'
    const expected = '<img src="https://example.com/photo.jpg">'

    expect(await transform(value)).toBe(expected)
  })

  it('should convert a figure container the same way', async () => {
    const value = '<figure data-lazy-src="https://example.com/photo.png"></figure>'
    const expected = '<img src="https://example.com/photo.png">'

    expect(await transform(value)).toBe(expected)
  })

  it('should keep an image-shaped src with a query string', async () => {
    const value = '<div data-src="https://example.com/photo.jpg?w=600"></div>'
    const expected = '<img src="https://example.com/photo.jpg?w=600">'

    expect(await transform(value)).toBe(expected)
  })

  it('should leave a div that already wraps an image', async () => {
    const value = html`
      <div data-src="https://example.com/photo.jpg">
        <img src="https://example.com/real.jpg">
      </div>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should leave a wrapper around a lazy video iframe', async () => {
    const value = html`
      <div data-src="https://example.com/x.jpg">
        <iframe src="about:blank"></iframe>
      </div>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not convert a non-image lazy src like an AJAX content URL', async () => {
    const value = '<div data-src="https://example.com/load-more.html"></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should not touch a div without a lazy attribute', async () => {
    const value = '<div class="text">Some text</div>'

    expect(await transform(value)).toBe(value)
  })

  it('should ignore a flag-style value that is not an image URL', async () => {
    const value = '<div data-src="true"></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should be idempotent', async () => {
    const value = '<div data-src="https://example.com/photo.jpg"></div>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
