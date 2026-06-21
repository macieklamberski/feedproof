import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { fixLazyImages } from './fixLazyImages.js'
import { flattenPictureElements } from './flattenPictureElements.js'

describeForEachParser('fixLazyImages', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [fixLazyImages(context)])
  }

  it('should move data-src to src', async () => {
    const value = '<img data-src="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
  })

  it('should keep the original lazy attribute after promoting', async () => {
    const value = '<img data-src="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
    expect(result).toContain('data-src="photo.jpg"')
  })

  it('should move data-original to src', async () => {
    const value = '<img data-original="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
  })

  it('should move data-lazy-src to src', async () => {
    const value = '<img data-lazy-src="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
  })

  it('should move data-url to src', async () => {
    const value = '<img data-url="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
  })

  it('should move data-srcset to srcset', async () => {
    const value = '<img data-srcset="small.jpg 300w, large.jpg 600w">'
    const result = await transform(value)

    expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
  })

  it('should extract image from noscript when sibling is lazy placeholder', async () => {
    const value = html`
      <img data-src="lazy.jpg">
      <noscript><img src="real.jpg"></noscript>
    `
    const result = await transform(value)

    expect(result).toContain('src="real.jpg"')
    expect(result).not.toContain('<noscript')
    expect(result).not.toContain('lazy.jpg')
  })

  it('should normalize attribute case on images extracted from noscript', async () => {
    const value = html`
      <img data-src="lazy.jpg">
      <noscript><IMG SRC="real.jpg"></noscript>
    `
    const result = await transform(value)

    expect(result).toContain('src="real.jpg"')
    expect(result).not.toContain('SRC=')
    expect(result).not.toContain('<noscript')
  })

  it('should not extract noscript when sibling is not an image', async () => {
    const value = html`
      <div>text</div>
      <noscript><img src="real.jpg"></noscript>
    `
    const result = await transform(value)

    expect(result).toContain('<noscript>')
  })

  it('should not extract noscript when it is the first child with no preceding sibling', async () => {
    const value = '<noscript><img src="real.jpg"></noscript>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not modify images without lazy attributes', async () => {
    const value = '<img src="already-loaded.jpg" alt="photo">'
    const result = await transform(value)

    expect(result).toContain('src="already-loaded.jpg"')
    expect(result).toContain('alt="photo"')
  })

  it('should move both data-src and data-srcset on same image', async () => {
    const value = '<img data-src="photo.jpg" data-srcset="small.jpg 300w, large.jpg 600w">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
    expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
  })

  it('should prefer data-src over data-original when both present', async () => {
    const value = '<img data-src="preferred.jpg" data-original="fallback.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="preferred.jpg"')
  })

  it('should move data-orig to src', async () => {
    const value = '<img data-orig="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
  })

  it('should move data-orig-file to src', async () => {
    const value = '<img data-orig-file="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
  })

  it('should move data-large-file to src', async () => {
    const value = '<img data-large-file="large.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="large.jpg"')
  })

  it('should move data-medium-file to src', async () => {
    const value = '<img data-medium-file="medium.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="medium.jpg"')
  })

  it('should move data-img-url to src', async () => {
    const value = '<img data-img-url="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
  })

  it('should move data-runner-src to src', async () => {
    const value = '<img data-runner-src="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
  })

  it('should move nitro-lazy-src to src', async () => {
    const value = '<img nitro-lazy-src="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
  })

  it('should move data-canonical-src to src', async () => {
    const value = '<img data-canonical-src="photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="photo.jpg"')
  })

  it('should prefer data-orig-file over data-large-file when both present', async () => {
    const value = '<img data-orig-file="orig.jpg" data-large-file="large.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="orig.jpg"')
  })

  it('should move data-image to src', async () => {
    const value = '<img data-image="https://images.squarespace-cdn.com/photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="https://images.squarespace-cdn.com/photo.jpg"')
  })

  it('should move data-thumb to src', async () => {
    const value = '<img data-thumb="https://example.com/thumb.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/thumb.jpg"')
  })

  it('should move data-thumb-src to src', async () => {
    const value = '<img data-thumb-src="https://example.com/thumb.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/thumb.jpg"')
  })

  it('should move data-original-src to src', async () => {
    const value = '<img data-original-src="https://cdn.example.com/photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="https://cdn.example.com/photo.jpg"')
  })

  it('should move data-image-src to src', async () => {
    const value = '<img data-image-src="https://example.com/photo.png">'
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/photo.png"')
  })

  it('should prefer data-src over data-image when both present', async () => {
    const value = '<img data-src="real.jpg" data-image="fallback.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="real.jpg"')
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

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not promote an empty string', async () => {
      const value = '<img data-src="">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should fall through to a later attribute when an earlier one is non-URL', async () => {
      const value = '<img data-src="loaded" data-original="real.jpg">'
      const result = await transform(value)

      expect(result).toContain('src="real.jpg"')
    })

    it('should accept a relative path with extension', async () => {
      const value = '<img data-src="photos/img.jpg">'
      const result = await transform(value)

      expect(result).toContain('src="photos/img.jpg"')
    })

    it('should accept a data: URI', async () => {
      const value = '<img data-src="data:image/png;base64,iVBORw0KGgo">'
      const result = await transform(value)

      expect(result).toContain('src="data:image/png;base64,iVBORw0KGgo"')
    })
  })

  it('should not extract noscript when sibling is img but noscript has no image', async () => {
    const value = html`
      <img src="x">
      <noscript>just text, no image tag</noscript>
    `
    const result = await transform(value)

    expect(result).toContain('<noscript>')
    expect(result).toContain('just text')
  })

  it('should overwrite existing src with data-src', async () => {
    const value = '<img src="placeholder.gif" data-src="real.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="real.jpg"')
    expect(result).not.toContain('placeholder.gif')
  })

  it('should handle html with no images', async () => {
    const value = '<p>No images here</p>'
    const result = await transform(value)

    expect(result).toContain('<p>No images here</p>')
  })

  describe('lazy srcset attributes', () => {
    it('should move data-lazy-srcset to srcset', async () => {
      const value = '<img data-lazy-srcset="small.jpg 300w, large.jpg 600w">'
      const result = await transform(value)

      expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
    })

    it('should move nitro-lazy-srcset to srcset', async () => {
      const value = '<img nitro-lazy-srcset="small.jpg 300w, large.jpg 600w">'
      const result = await transform(value)

      expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
    })

    it('should move data-flickity-lazyload-srcset to srcset', async () => {
      const value = '<img data-flickity-lazyload-srcset="small.jpg 300w, large.jpg 600w">'
      const result = await transform(value)

      expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
    })

    it('should prefer data-srcset over data-lazy-srcset when both present', async () => {
      const value = '<img data-srcset="primary.jpg 300w" data-lazy-srcset="fallback.jpg 300w">'
      const result = await transform(value)

      expect(result).toContain('srcset="primary.jpg 300w"')
    })

    it('should move data-tf-srcset to srcset', async () => {
      const value = '<img data-tf-srcset="a.jpg 150w, b.jpg 300w">'
      const result = await transform(value)

      expect(result).toContain('srcset="a.jpg 150w, b.jpg 300w"')
    })

    it('should move data-pswp-srcset to srcset', async () => {
      const value = '<img data-pswp-srcset="a.jpg 300w, b.jpg 150w">'
      const result = await transform(value)

      expect(result).toContain('srcset="a.jpg 300w, b.jpg 150w"')
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

  describe('overrides', () => {
    it('should ignore default lazySrcAttributes when override is provided', async () => {
      const customContext: TransformContext = { ...baseContext, lazySrcAttributes: ['data-img'] }
      const value = '<img data-src="ignored.jpg">'
      const result = await transform(value, customContext)

      expect(result).toContain('data-src="ignored.jpg"')
      expect(result).not.toContain('<img src=')
    })

    it('should use the provided lazySrcAttributes', async () => {
      const customContext: TransformContext = { ...baseContext, lazySrcAttributes: ['data-img'] }
      const value = '<img data-img="photo.jpg">'
      const result = await transform(value, customContext)

      expect(result).toContain('src="photo.jpg"')
    })

    it('should ignore default lazySrcsetAttributes when override is provided', async () => {
      const customContext: TransformContext = {
        ...baseContext,
        lazySrcsetAttributes: ['data-custom-srcset'],
      }
      const value = '<img data-srcset="small.jpg 300w, large.jpg 600w">'
      const result = await transform(value, customContext)

      expect(result).toContain('data-srcset="small.jpg 300w, large.jpg 600w"')
      expect(result).not.toContain('<img srcset=')
    })

    it('should use the provided lazySrcsetAttributes', async () => {
      const customContext: TransformContext = {
        ...baseContext,
        lazySrcsetAttributes: ['data-custom-srcset'],
      }
      const value = '<img data-custom-srcset="small.jpg 300w, large.jpg 600w">'
      const result = await transform(value, customContext)

      expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
    })
  })

  describe('source elements', () => {
    it('should promote lazy srcset on a source element', async () => {
      const value = '<picture><source data-srcset="photo.avif" type="image/avif"></picture>'
      const result = await transform(value)

      expect(result).toContain('srcset="photo.avif"')
    })

    it('should promote lazy src on a source element', async () => {
      const value = '<video><source data-src="clip.mp4"></video>'
      const result = await transform(value)

      expect(result).toContain('src="clip.mp4"')
    })

    it('should keep the modern source through picture flattening', async () => {
      const value = html`
        <picture>
          <source data-srcset="photo.avif" type="image/avif">
          <img src="photo.jpg">
        </picture>
      `
      const result = await applyDomTransforms(parseHtml(value), [
        fixLazyImages(baseContext),
        flattenPictureElements(baseContext),
      ])

      // Without the lazy-source promotion, flatten drops the empty-srcset source and
      // this would be src="photo.jpg" with no srcset.
      expect(result).toContain('srcset="photo.avif"')
    })
  })

  it('should be idempotent', async () => {
    const value = '<img data-src="photo.jpg">'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
