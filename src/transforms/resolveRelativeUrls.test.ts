import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { resolveRelativeUrls } from './resolveRelativeUrls.js'

const context: TransformContext = {}

describe('resolveRelativeUrls', () => {
  const resolve = (html: string) => {
    return transformHtml(html, resolveRelativeUrls({ ...context, baseUrl: 'https://example.com' }))
  }

  it('should resolve relative href on anchors', () => {
    const result = resolve('<a href="/page">link</a>')

    expect(result).toContain('href="https://example.com/page"')
  })

  it('should resolve relative src on images', () => {
    const result = resolve('<img src="/images/photo.jpg">')

    expect(result).toContain('src="https://example.com/images/photo.jpg"')
  })

  it('should resolve relative src on video elements', () => {
    const result = resolve('<video src="/video.mp4"></video>')

    expect(result).toContain('src="https://example.com/video.mp4"')
  })

  it('should resolve relative src on audio elements', () => {
    const result = resolve('<audio src="/audio.mp3"></audio>')

    expect(result).toContain('src="https://example.com/audio.mp3"')
  })

  it('should resolve relative src on source elements', () => {
    const result = resolve('<video><source src="/video.mp4"></video>')

    expect(result).toContain('src="https://example.com/video.mp4"')
  })

  it('should resolve relative src on iframes', () => {
    const result = resolve('<iframe src="/embed"></iframe>')

    expect(result).toContain('src="https://example.com/embed"')
  })

  it('should resolve relative video poster', () => {
    const result = resolve('<video poster="/thumb.jpg"></video>')

    expect(result).toContain('poster="https://example.com/thumb.jpg"')
  })

  it('should resolve srcset entries', () => {
    const result = resolve('<img srcset="/small.jpg 300w, /large.jpg 600w">')

    expect(result).toContain('https://example.com/small.jpg 300w')
    expect(result).toContain('https://example.com/large.jpg 600w')
  })

  it('should resolve camelCase srcSet from React/Next.js', () => {
    const result = resolve('<img srcSet="/small.jpg 1x, /large.jpg 2x" src="/img.jpg">')

    expect(result).toContain('https://example.com/small.jpg 1x')
    expect(result).toContain('https://example.com/large.jpg 2x')
    expect(result).not.toContain('srcSet')
    expect(result).toContain('srcset=')
  })

  it('should preserve already-absolute URLs', () => {
    const result = resolve('<a href="https://other.com/page">link</a>')

    expect(result).toContain('href="https://other.com/page"')
  })

  it('should skip data: URLs', () => {
    const result = resolve('<img src="data:image/png;base64,abc">')

    expect(result).toContain('src="data:image/png;base64,abc"')
  })

  it('should skip mailto: URLs', () => {
    const result = resolve('<a href="mailto:test@example.com">email</a>')

    expect(result).toContain('href="mailto:test@example.com"')
  })

  it('should skip tel: URLs', () => {
    const result = resolve('<a href="tel:+1234567890">call</a>')

    expect(result).toContain('href="tel:+1234567890"')
  })

  it('should skip javascript: URLs', () => {
    const result = resolve('<a href="javascript:void(0)">click</a>')

    expect(result).toContain('href="javascript:void(0)"')
  })

  it('should resolve fragment-only URLs against base', () => {
    const result = resolve('<a href="#section">jump</a>')

    expect(result).toContain('href="https://example.com/#section"')
  })

  it('should handle protocol-relative URLs', () => {
    const result = resolve('<img src="//cdn.example.com/img.jpg">')

    expect(result).toContain('src="https://cdn.example.com/img.jpg"')
  })

  it('should handle invalid URLs gracefully', () => {
    const result = resolve('<a href="://broken">link</a>')

    expect(result).toContain('link')
  })

  it('should not modify html with no resolvable attributes', () => {
    const html = '<p>No links or images</p>'
    const result = resolve(html)

    expect(result).toContain('<p>No links or images</p>')
  })

  it('should resolve srcset with single entry and no descriptor', () => {
    const result = resolve('<img srcset="/photo.jpg">')

    expect(result).toContain('https://example.com/photo.jpg')
  })

  it('should preserve commas inside srcset URLs', () => {
    const srcset = [
      'https://substackcdn.com/image/fetch/w_424,c_limit,f_webp/https%3A%2F%2Fexample.com%2Fimg.png 424w',
      'https://substackcdn.com/image/fetch/w_848,c_limit,f_webp/https%3A%2F%2Fexample.com%2Fimg.png 848w',
    ].join(', ')
    const result = resolve(`<img srcset="${srcset}">`)

    expect(result).toContain(
      'https://substackcdn.com/image/fetch/w_424,c_limit,f_webp/https%3A%2F%2Fexample.com%2Fimg.png 424w',
    )
    expect(result).toContain(
      'https://substackcdn.com/image/fetch/w_848,c_limit,f_webp/https%3A%2F%2Fexample.com%2Fimg.png 848w',
    )
  })

  it('should not split Substack CDN srcset into fragments resolved against base URL', () => {
    const srcset = [
      'https://substackcdn.com/image/fetch/w_424,c_limit,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ftest.png 424w',
      'https://substackcdn.com/image/fetch/w_848,c_limit,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ftest.png 848w',
    ].join(', ')
    const result = resolve(`<img srcset="${srcset}">`)

    expect(result).not.toContain('https://example.com/w_424')
    expect(result).not.toContain('https://example.com/c_limit')
    expect(result).not.toContain('https://example.com/f_webp')
  })
})
