import { describe, expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { fixSubstackImageLinks } from './fixSubstackImageLinks.js'

const imageHref =
  'https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fexample-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F4c63db06-ab49-4955-8475-58e6033c09a7_1021x568.jpeg'

describeForEachParser('fixSubstackImageLinks', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [fixSubstackImageLinks(baseContext)])
  }

  describe('happy paths', () => {
    it('should mint the image back into an emptied Image2ToDOM anchor', async () => {
      const value = html`
        <a
          class="image-link image2 is-viewable-img"
          target="_blank"
          href="${imageHref}"
          data-component-name="Image2ToDOM"
        ></a>
      `
      const result = await transform(value)

      expect(result).toEqualHtml(html`
        <a
          class="image-link image2 is-viewable-img"
          target="_blank"
          href="${imageHref}"
          data-component-name="Image2ToDOM"
        >
          <img src="${imageHref}">
        </a>
      `)
    })

    it('should mint the image into an emptied ImageToDOM anchor', async () => {
      const value = html`
        <a
          class="image-link is-viewable-img image2"
          href="https://cdn.example.com/photo_700x431.png"
          data-component-name="ImageToDOM"
        ></a>
      `
      const result = await transform(value)

      expect(result).toEqualHtml(html`
        <a
          class="image-link is-viewable-img image2"
          href="https://cdn.example.com/photo_700x431.png"
          data-component-name="ImageToDOM"
        >
          <img src="https://cdn.example.com/photo_700x431.png">
        </a>
      `)
    })

    it('should treat an anchor holding only whitespace as empty', async () => {
      const value = `<a class="image-link image2" href="https://cdn.example.com/photo.jpeg"> </a>`
      const result = await transform(value)

      // The whitespace text node stays; the image is appended after it.
      expect(result).toEqualHtml(
        `<a class="image-link image2" href="https://cdn.example.com/photo.jpeg"> <img src="https://cdn.example.com/photo.jpeg"></a>`,
      )
    })
  })

  describe('leave-alone cases', () => {
    it('should leave a populated anchor untouched', async () => {
      const value = html`
        <a class="image-link image2 is-viewable-img" href="${imageHref}">
          <img src="https://cdn.example.com/rendition_1456.jpeg" width="1021" height="568">
        </a>
      `
      const result = await transform(value)

      expect(result).toBe(value)
    })

    it('should leave an anchor holding text untouched', async () => {
      const value = html`
        <a
          class="image-link"
          href="${imageHref}"
        >View image</a>
      `
      const result = await transform(value)

      expect(result).toBe(value)
    })

    it('should leave an anchor whose href is not an image file untouched', async () => {
      const value = html`
        <a
          class="image-link
          image2"
          href="https://example.com/p/post"
        ></a>
      `
      const result = await transform(value)

      expect(result).toBe(value)
    })

    it('should leave an anchor without an href untouched', async () => {
      const value = '<a class="image-link image2"></a>'
      const result = await transform(value)

      expect(result).toBe(value)
    })

    it('should leave an empty anchor without the image-link class untouched', async () => {
      const value = '<a href="https://cdn.example.com/photo.jpeg"></a>'
      const result = await transform(value)

      expect(result).toBe(value)
    })
  })

  it('should dimension the minted image through the default pipeline end to end', async () => {
    const value = html`
      <div class="captioned-image-container">
        <figure>
          <a
            class="image-link image2 is-viewable-img"
            target="_blank"
            href="${imageHref}"
            data-component-name="Image2ToDOM"
          ></a>
        </figure>
      </div>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    // resolveMediaDimensions reads the size off the `_1021x568.jpeg` filename in the href.
    expect(result).toEqualHtml(html`
      <figure>
        <a
          class="image-link image2 is-viewable-img"
          target="_blank"
          href="${imageHref}"
          data-component-name="Image2ToDOM"
        >
          <img src="${imageHref}" width="1021" height="568">
        </a>
      </figure>
    `)
  })

  it('should be idempotent', async () => {
    const value = html`
      <a
        class="image-link
        image2"
        href="${imageHref}"
      ></a>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
