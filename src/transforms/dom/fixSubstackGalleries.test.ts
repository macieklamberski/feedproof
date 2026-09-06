import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html, jsonAttrValue } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { fixSubstackGalleries } from './fixSubstackGalleries.js'

// Substack stores the gallery payload in a double-quoted data-attrs attribute with the inner
// quotes HTML-encoded, which is what survives a parse and serialise roundtrip.
const makeGallery = (attrs: Record<string, unknown> | string): string => {
  return `<div class="image-gallery-embed" data-attrs="${jsonAttrValue(attrs)}"></div>`
}

describeForEachParser('fixSubstackGalleries', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [fixSubstackGalleries(baseContext)])
  }

  describe('happy paths', () => {
    it('should rebuild the gallery as a figure of its images with the caption', async () => {
      const gallery = makeGallery({
        gallery: {
          images: [
            { type: 'image/jpeg', src: 'https://cdn.example.com/images/first_1500x1000.jpeg' },
            { type: 'image/jpeg', src: 'https://cdn.example.com/images/second_1500x1000.jpeg' },
          ],
          caption: 'Two views of the harbour',
          alt: 'The harbour at dawn and at dusk',
          staticGalleryImage: {
            type: 'image/png',
            src: 'https://cdn.example.com/images/collage_1456x720.png',
          },
        },
        isEditorNode: true,
      })
      const value = `<p>Before</p>${gallery}<p>After</p>`
      const expected = html`
        <p>Before</p>
        <figure>
          <img
            src="https://cdn.example.com/images/first_1500x1000.jpeg"
            alt="The harbour at dawn and at dusk"
          />
          <img
            src="https://cdn.example.com/images/second_1500x1000.jpeg"
            alt="The harbour at dawn and at dusk"
          />
          <figcaption>Two views of the harbour</figcaption>
        </figure>
        <p>After</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave out the caption and alt when the payload has neither', async () => {
      const gallery = makeGallery({
        gallery: {
          images: [{ type: 'image/png', src: 'https://cdn.example.com/images/only_800x600.png' }],
          caption: '',
          alt: '',
        },
      })
      const expected = html`
        <figure>
          <img src="https://cdn.example.com/images/only_800x600.png" />
        </figure>
      `

      expect(await transform(gallery)).toEqualHtml(expected)
    })

    it('should skip an entry without a string src and keep the rest', async () => {
      const gallery = makeGallery({
        gallery: {
          images: [
            { type: 'image/jpeg' },
            null,
            { type: 'image/jpeg', src: 'https://cdn.example.com/images/kept_1500x1000.jpeg' },
          ],
        },
      })
      const expected = html`
        <figure>
          <img src="https://cdn.example.com/images/kept_1500x1000.jpeg" />
        </figure>
      `

      expect(await transform(gallery)).toEqualHtml(expected)
    })
  })

  describe('sad paths', () => {
    it('should leave the div alone when it carries no payload', async () => {
      const value = '<div class="image-gallery-embed"></div>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave the div alone when the payload is not JSON', async () => {
      const value = makeGallery('{"gallery":')

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave the div alone when the payload names no images', async () => {
      const value = makeGallery({ gallery: { images: [], caption: 'Nothing here' } })

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('edge cases', () => {
    it('should be idempotent', async () => {
      const gallery = makeGallery({
        gallery: {
          images: [
            { type: 'image/jpeg', src: 'https://cdn.example.com/images/one_1500x1000.jpeg' },
          ],
          caption: 'One view',
        },
      })
      const once = await transform(gallery)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })
})
