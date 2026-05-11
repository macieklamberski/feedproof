import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import { defaultLazySrcAttributes, defaultLazySrcsetAttributes } from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { fixLazyImages } from './fixLazyImages.js'

const context: TransformContext = {
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
}

describe('fixLazyImages', () => {
  it('should move data-src to src', () => {
    const html = '<img data-src="photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).not.toContain('data-src')
  })

  it('should move data-original to src', () => {
    const html = '<img data-original="photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).not.toContain('data-original')
  })

  it('should move data-lazy-src to src', () => {
    const html = '<img data-lazy-src="photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).not.toContain('data-lazy-src')
  })

  it('should move data-url to src', () => {
    const html = '<img data-url="photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).not.toContain('data-url')
  })

  it('should move data-srcset to srcset', () => {
    const html = '<img data-srcset="small.jpg 300w, large.jpg 600w">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
    expect(result).not.toContain('data-srcset')
  })

  it('should extract image from noscript when sibling is lazy placeholder', () => {
    const html = '<img data-src="lazy.jpg"><noscript><img src="real.jpg"></noscript>'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="real.jpg"')
  })

  it('should not extract noscript when sibling is not an image', () => {
    const html = '<div>text</div><noscript><img src="real.jpg"></noscript>'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('<noscript>')
  })

  it('should not modify images without lazy attributes', () => {
    const html = '<img src="already-loaded.jpg" alt="photo">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="already-loaded.jpg"')
    expect(result).toContain('alt="photo"')
  })

  it('should move both data-src and data-srcset on same image', () => {
    const html = '<img data-src="photo.jpg" data-srcset="small.jpg 300w, large.jpg 600w">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
    expect(result).not.toContain('data-src')
    expect(result).not.toContain('data-srcset')
  })

  it('should prefer data-src over data-original when both present', () => {
    const html = '<img data-src="preferred.jpg" data-original="fallback.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="preferred.jpg"')
    expect(result).not.toContain('data-src')
    expect(result).not.toContain('data-original')
  })

  it('should move data-orig to src', () => {
    const html = '<img data-orig="photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).not.toContain('data-orig')
  })

  it('should move data-orig-file to src', () => {
    const html = '<img data-orig-file="photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).not.toContain('data-orig-file')
  })

  it('should move data-large-file to src', () => {
    const html = '<img data-large-file="large.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="large.jpg"')
    expect(result).not.toContain('data-large-file')
  })

  it('should move data-medium-file to src', () => {
    const html = '<img data-medium-file="medium.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="medium.jpg"')
    expect(result).not.toContain('data-medium-file')
  })

  it('should move data-img-url to src', () => {
    const html = '<img data-img-url="photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).not.toContain('data-img-url')
  })

  it('should move data-runner-src to src', () => {
    const html = '<img data-runner-src="photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).not.toContain('data-runner-src')
  })

  it('should move nitro-lazy-src to src', () => {
    const html = '<img nitro-lazy-src="photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).not.toContain('nitro-lazy-src')
  })

  it('should move data-canonical-src to src', () => {
    const html = '<img data-canonical-src="photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="photo.jpg"')
    expect(result).not.toContain('data-canonical-src')
  })

  it('should prefer data-orig-file over data-large-file when both present', () => {
    const html = '<img data-orig-file="orig.jpg" data-large-file="large.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="orig.jpg"')
    expect(result).not.toContain('data-orig-file')
    expect(result).not.toContain('data-large-file')
  })

  it('should move data-image to src', () => {
    const html = '<img data-image="https://images.squarespace-cdn.com/photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="https://images.squarespace-cdn.com/photo.jpg"')
    expect(result).not.toContain('data-image')
  })

  it('should move data-thumb to src', () => {
    const html = '<img data-thumb="https://example.com/thumb.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="https://example.com/thumb.jpg"')
    expect(result).not.toContain('data-thumb')
  })

  it('should move data-thumb-src to src', () => {
    const html = '<img data-thumb-src="https://example.com/thumb.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="https://example.com/thumb.jpg"')
    expect(result).not.toContain('data-thumb-src')
  })

  it('should move data-original-src to src', () => {
    const html = '<img data-original-src="https://cdn.example.com/photo.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="https://cdn.example.com/photo.jpg"')
    expect(result).not.toContain('data-original-src')
  })

  it('should move data-image-src to src', () => {
    const html = '<img data-image-src="https://example.com/photo.png">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="https://example.com/photo.png"')
    expect(result).not.toContain('data-image-src')
  })

  it('should prefer data-src over data-image when both present', () => {
    const html = '<img data-src="real.jpg" data-image="fallback.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="real.jpg"')
    expect(result).not.toContain('data-src')
    expect(result).not.toContain('data-image')
  })

  describe('URL-shape guard', () => {
    it('should not promote a non-URL value like "left"', () => {
      const html = '<img data-orig="left">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).not.toContain('src="left"')
      expect(result).not.toContain('data-orig')
    })

    it('should not promote a numeric flag value like "1"', () => {
      const html = '<img data-src="1">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).not.toContain('src="1"')
      expect(result).not.toContain('data-src')
    })

    it('should not promote a boolean-string value like "true"', () => {
      const html = '<img data-src="true">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).not.toContain('src="true"')
      expect(result).not.toContain('data-src')
    })

    it('should not promote a JSON-object value', () => {
      const html = '<img data-src=\'{"foo":"bar"}\'>'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).not.toContain('src=')
      expect(result).not.toContain('data-src')
    })

    it('should not promote an empty string', () => {
      const html = '<img data-src="">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).not.toContain('src=')
      expect(result).not.toContain('data-src')
    })

    it('should fall through to a later attribute when an earlier one is non-URL', () => {
      const html = '<img data-src="loaded" data-original="real.jpg">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).toContain('src="real.jpg"')
      expect(result).not.toContain('data-src')
      expect(result).not.toContain('data-original')
    })

    it('should accept a relative path with extension', () => {
      const html = '<img data-src="photos/img.jpg">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).toContain('src="photos/img.jpg"')
    })

    it('should accept a data: URI', () => {
      const html = '<img data-src="data:image/png;base64,iVBORw0KGgo">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).toContain('src="data:image/png;base64,iVBORw0KGgo"')
    })
  })

  it('should not extract noscript when sibling is img but noscript has no image', () => {
    const html = '<img src="x"><noscript>just text, no image tag</noscript>'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('<noscript>')
    expect(result).toContain('just text')
  })

  it('should overwrite existing src with data-src', () => {
    const html = '<img src="placeholder.gif" data-src="real.jpg">'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('src="real.jpg"')
    expect(result).not.toContain('placeholder.gif')
    expect(result).not.toContain('data-src')
  })

  it('should handle html with no images', () => {
    const html = '<p>No images here</p>'
    const result = transformHtml(html, fixLazyImages(context))

    expect(result).toContain('<p>No images here</p>')
  })

  describe('lazy srcset attributes', () => {
    it('should move data-lazy-srcset to srcset', () => {
      const html = '<img data-lazy-srcset="small.jpg 300w, large.jpg 600w">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
      expect(result).not.toContain('data-lazy-srcset')
    })

    it('should move nitro-lazy-srcset to srcset', () => {
      const html = '<img nitro-lazy-srcset="small.jpg 300w, large.jpg 600w">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
      expect(result).not.toContain('nitro-lazy-srcset')
    })

    it('should move data-flickity-lazyload-srcset to srcset', () => {
      const html = '<img data-flickity-lazyload-srcset="small.jpg 300w, large.jpg 600w">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
      expect(result).not.toContain('data-flickity-lazyload-srcset')
    })

    it('should prefer data-srcset over data-lazy-srcset when both present', () => {
      const html = '<img data-srcset="primary.jpg 300w" data-lazy-srcset="fallback.jpg 300w">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).toContain('srcset="primary.jpg 300w"')
      expect(result).not.toContain('data-srcset')
      expect(result).not.toContain('data-lazy-srcset')
    })

    it('should move data-tf-srcset to srcset', () => {
      const html = '<img data-tf-srcset="a.jpg 150w, b.jpg 300w">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).toContain('srcset="a.jpg 150w, b.jpg 300w"')
      expect(result).not.toContain('data-tf-srcset')
    })

    it('should move data-pswp-srcset to srcset', () => {
      const html = '<img data-pswp-srcset="a.jpg 300w, b.jpg 150w">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).toContain('srcset="a.jpg 300w, b.jpg 150w"')
      expect(result).not.toContain('data-pswp-srcset')
    })

    it('should skip non-URL srcset values like Cloudinary transform params', () => {
      const html = '<img data-srcset="w_200,h_200 200w, w_400,h_400 400w">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).not.toContain('srcset=')
      expect(result).not.toContain('data-srcset')
    })

    it('should skip empty srcset values and remove the attribute', () => {
      const html = '<img data-image-srcset="">'
      const result = transformHtml(html, fixLazyImages(context))

      expect(result).not.toContain('srcset=')
      expect(result).not.toContain('data-image-srcset')
    })
  })

  describe('overrides', () => {
    it('should ignore default lazySrcAttributes when override is provided', () => {
      const customContext: TransformContext = { lazySrcAttributes: ['data-img'] }
      const html = '<img data-src="ignored.jpg">'
      const result = transformHtml(html, fixLazyImages(customContext))

      expect(result).toContain('data-src="ignored.jpg"')
      expect(result).not.toContain('<img src=')
    })

    it('should use the provided lazySrcAttributes', () => {
      const customContext: TransformContext = { lazySrcAttributes: ['data-img'] }
      const html = '<img data-img="photo.jpg">'
      const result = transformHtml(html, fixLazyImages(customContext))

      expect(result).toContain('src="photo.jpg"')
      expect(result).not.toContain('data-img')
    })

    it('should ignore default lazySrcsetAttributes when override is provided', () => {
      const customContext: TransformContext = { lazySrcsetAttributes: ['data-custom-srcset'] }
      const html = '<img data-srcset="small.jpg 300w, large.jpg 600w">'
      const result = transformHtml(html, fixLazyImages(customContext))

      expect(result).toBe(html)
    })

    it('should use the provided lazySrcsetAttributes', () => {
      const customContext: TransformContext = { lazySrcsetAttributes: ['data-custom-srcset'] }
      const html = '<img data-custom-srcset="small.jpg 300w, large.jpg 600w">'
      const result = transformHtml(html, fixLazyImages(customContext))

      expect(result).toContain('srcset="small.jpg 300w, large.jpg 600w"')
      expect(result).not.toContain('data-custom-srcset')
    })
  })
})
