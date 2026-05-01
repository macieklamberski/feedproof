import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { fixLazyImages } from './fixLazyImages.js'

const context: TransformContext = {}

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
})
