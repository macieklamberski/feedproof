import { describe, expect, it } from 'bun:test'
import { defaultLazySrcAttributes, defaultLazySrcsetAttributes } from '../../defaults.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { fixLazyImages } from './fixLazyImages.js'
import { flattenPictureElements } from './flattenPictureElements.js'

describeForEachParser('fixLazyImages', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [fixLazyImages(context)])
  }

  // Iterates the real default list, so every entry is exercised and a new entry
  // is covered automatically.
  it.each(defaultLazySrcAttributes)('should promote %s into src', async (attribute) => {
    const value = `<img ${attribute}="photo.jpg">`
    const expected = `<img ${attribute}="photo.jpg" src="photo.jpg">`

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should keep the original lazy attribute after promoting', async () => {
    const value = '<img data-src="photo.jpg">'
    const expected = '<img data-src="photo.jpg" src="photo.jpg">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should extract image from noscript when sibling is lazy placeholder', async () => {
    const value = html`
      <img data-src="lazy.jpg">
      <noscript>
        <img src="real.jpg">
      </noscript>
    `
    const expected = '<img src="real.jpg">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should normalize attribute case on images extracted from noscript', async () => {
    const value = html`
      <img data-src="lazy.jpg">
      <noscript>
        <IMG SRC="real.jpg">
      </noscript>
    `
    const expected = '<img src="real.jpg">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should not extract noscript when sibling is not an image', async () => {
    const value = html`
      <div>text</div>
      <noscript>
        <img src="real.jpg">
      </noscript>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not extract noscript when it is the first child with no preceding sibling', async () => {
    const value = '<noscript><img src="real.jpg"></noscript>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not modify images without lazy attributes', async () => {
    const value = '<img src="already-loaded.jpg" alt="photo">'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should move both data-src and data-srcset on same image', async () => {
    const value = '<img data-src="photo.jpg" data-srcset="small.jpg 300w, large.jpg 600w">'
    const expected = html`
      <img
        data-src="photo.jpg"
        data-srcset="small.jpg 300w, large.jpg 600w"
        src="photo.jpg"
        srcset="small.jpg 300w, large.jpg 600w"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should prefer data-src over data-original when both present', async () => {
    const value = '<img data-src="preferred.jpg" data-original="fallback.jpg">'
    const expected = html`
      <img
        data-src="preferred.jpg"
        data-original="fallback.jpg"
        src="preferred.jpg"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should prefer data-orig-file over data-large-file when both present', async () => {
    const value = '<img data-orig-file="orig.jpg" data-large-file="large.jpg">'
    const expected = html`
      <img
        data-orig-file="orig.jpg"
        data-large-file="large.jpg"
        src="orig.jpg"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should prefer data-src over data-image when both present', async () => {
    const value = '<img data-src="real.jpg" data-image="fallback.jpg">'
    const expected = html`
      <img
        data-src="real.jpg"
        data-image="fallback.jpg"
        src="real.jpg"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  describe('URL-shape guard', () => {
    it('should not promote a non-URL value like "left"', async () => {
      const value = '<img data-orig="left">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote a numeric flag value like "1"', async () => {
      const value = '<img data-src="1">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote a boolean-string value like "true"', async () => {
      const value = '<img data-src="true">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote a JSON-object value', async () => {
      const value = '<img data-src=\'{"standard":"photo.jpg","retina":"photo@2x.jpg"}\'>'
      const expected = html`
        <img
          data-src="{&quot;standard&quot;:&quot;photo.jpg&quot;,&quot;retina&quot;:&quot;photo@2x.jpg&quot;}"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should not promote an empty string', async () => {
      const value = '<img data-src="">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should fall through to a later attribute when an earlier one is non-URL', async () => {
      const value = '<img data-src="loaded" data-original="real.jpg">'
      const expected = html`
        <img
          data-src="loaded"
          data-original="real.jpg"
          src="real.jpg"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should accept a relative path with extension', async () => {
      const value = '<img data-src="photos/img.jpg">'
      const expected = '<img data-src="photos/img.jpg" src="photos/img.jpg">'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should accept a data: URI', async () => {
      const value = '<img data-src="data:image/png;base64,iVBORw0KGgo">'
      const expected = html`
        <img
          data-src="data:image/png;base64,iVBORw0KGgo"
          src="data:image/png;base64,iVBORw0KGgo"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  it('should not extract noscript when sibling is img but noscript has no image', async () => {
    const value = html`
      <img src="x">
      <noscript>just text, no image tag</noscript>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should overwrite existing src with data-src', async () => {
    const value = '<img src="placeholder.gif" data-src="real.jpg">'
    const expected = '<img src="real.jpg" data-src="real.jpg">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should handle html with no images', async () => {
    const value = '<p>No images here</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  describe('lazy srcset attributes', () => {
    it.each(defaultLazySrcsetAttributes)('should promote %s into srcset', async (attribute) => {
      const value = `<img ${attribute}="small.jpg 300w, large.jpg 600w">`
      const expected = `<img ${attribute}="small.jpg 300w, large.jpg 600w" srcset="small.jpg 300w, large.jpg 600w">`

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should prefer data-srcset over data-lazy-srcset when both present', async () => {
      const value = '<img data-srcset="primary.jpg 300w" data-lazy-srcset="fallback.jpg 300w">'
      const expected = html`
        <img
          data-srcset="primary.jpg 300w"
          data-lazy-srcset="fallback.jpg 300w"
          srcset="primary.jpg 300w"
        >
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should skip non-URL srcset values like Cloudinary transform params', async () => {
      const value = '<img data-srcset="w_200,h_200 200w, w_400,h_400 400w">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should skip empty srcset values', async () => {
      const value = '<img data-image-srcset="">'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('source elements', () => {
    it('should promote lazy srcset on a source element', async () => {
      const value = '<picture><source data-srcset="photo.avif" type="image/avif"></picture>'
      const expected = html`
        <picture>
          <source
            data-srcset="photo.avif"
            type="image/avif"
            srcset="photo.avif"
          >
        </picture>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should promote lazy src on a source element', async () => {
      const value = '<video><source data-src="clip.mp4"></video>'
      const expected = '<video><source data-src="clip.mp4" src="clip.mp4"></video>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should keep the modern source through picture flattening', async () => {
      const value = html`
        <picture>
          <source data-srcset="photo.avif" type="image/avif">
          <img src="photo.jpg">
        </picture>
      `
      // Without the lazy-source promotion, flatten drops the empty-srcset source and
      // this would be src="photo.jpg" with no srcset.
      const expected = '<img src="photo.avif" srcset="photo.avif">'
      const result = await applyDomTransforms(parseHtml(value), [
        fixLazyImages(baseContext),
        flattenPictureElements(baseContext),
      ])

      expect(result).toEqualHtml(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = '<img data-src="photo.jpg">'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
