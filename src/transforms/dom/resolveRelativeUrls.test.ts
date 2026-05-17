import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { resolveRelativeUrls } from './resolveRelativeUrls.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
  baseUrl: 'https://example.com',
}

describe('resolveRelativeUrls', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return transformHtml(html, resolveRelativeUrls(context))
  }

  it('should resolve relative href on anchors', async () => {
    const value = '<a href="/page">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com/page"')
  })

  it('should resolve relative src on images', async () => {
    const value = '<img src="/images/photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/images/photo.jpg"')
  })

  it('should resolve relative src on video elements', async () => {
    const value = '<video src="/video.mp4"></video>'
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/video.mp4"')
  })

  it('should resolve relative src on audio elements', async () => {
    const value = '<audio src="/audio.mp3"></audio>'
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/audio.mp3"')
  })

  it('should resolve relative src on source elements', async () => {
    const value = '<video><source src="/video.mp4"></video>'
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/video.mp4"')
  })

  it('should resolve relative src on iframes', async () => {
    const value = '<iframe src="/embed"></iframe>'
    const result = await transform(value)

    expect(result).toContain('src="https://example.com/embed"')
  })

  it('should resolve relative video poster', async () => {
    const value = '<video poster="/thumb.jpg"></video>'
    const result = await transform(value)

    expect(result).toContain('poster="https://example.com/thumb.jpg"')
  })

  it('should resolve srcset entries', async () => {
    const value = '<img srcset="/small.jpg 300w, /large.jpg 600w">'
    const result = await transform(value)

    expect(result).toContain('https://example.com/small.jpg 300w')
    expect(result).toContain('https://example.com/large.jpg 600w')
  })

  it('should resolve camelCase srcSet from React/Next.js', async () => {
    const value = '<img srcSet="/small.jpg 1x, /large.jpg 2x" src="/img.jpg">'
    const result = await transform(value)

    expect(result).toContain('https://example.com/small.jpg 1x')
    expect(result).toContain('https://example.com/large.jpg 2x')
    expect(result).not.toContain('srcSet')
    expect(result).toContain('srcset=')
  })

  it('should preserve already-absolute URLs', async () => {
    const value = '<a href="https://other.com/page">link</a>'
    const result = await transform(value)

    expect(result).toContain('href="https://other.com/page"')
  })

  it('should skip data: URLs', async () => {
    const value = '<img src="data:image/png;base64,abc">'
    const result = await transform(value)

    expect(result).toContain('src="data:image/png;base64,abc"')
  })

  it('should skip mailto: URLs', async () => {
    const value = '<a href="mailto:test@example.com">email</a>'
    const result = await transform(value)

    expect(result).toContain('href="mailto:test@example.com"')
  })

  it('should skip tel: URLs', async () => {
    const value = '<a href="tel:+1234567890">call</a>'
    const result = await transform(value)

    expect(result).toContain('href="tel:+1234567890"')
  })

  it('should skip javascript: URLs', async () => {
    const value = '<a href="javascript:void(0)">click</a>'
    const result = await transform(value)

    expect(result).toContain('href="javascript:void(0)"')
  })

  it('should preserve fragment-only hrefs (in-article anchors)', async () => {
    const value = '<a href="#section">jump</a>'
    const result = await transform(value)

    expect(result).toContain('href="#section"')
    expect(result).not.toContain('https://example.com/#section')
  })

  it('should preserve fragment-only href even when no matching target exists', async () => {
    const value = '<a href="#missing">jump</a>'
    const result = await transform(value)

    expect(result).toContain('href="#missing"')
  })

  it('should preserve fragment-only href alongside an id target', async () => {
    const value = '<a href="#section">jump</a><h2 id="section">Section</h2>'
    const result = await transform(value)

    expect(result).toContain('href="#section"')
    expect(result).toContain('<h2 id="section">')
  })

  it('should still resolve hrefs that combine a path with a fragment', async () => {
    const value = '<a href="/page#section">jump</a>'
    const result = await transform(value)

    expect(result).toContain('href="https://example.com/page#section"')
  })

  it('should handle protocol-relative URLs', async () => {
    const value = '<img src="//cdn.example.com/img.jpg">'
    const result = await transform(value)

    expect(result).toContain('src="https://cdn.example.com/img.jpg"')
  })

  it('should handle invalid URLs gracefully', async () => {
    const value = '<a href="://broken">link</a>'
    const result = await transform(value)

    expect(result).toContain('link')
  })

  it('should not modify html with no resolvable attributes', async () => {
    const value = '<p>No links or images</p>'
    const result = await transform(value)

    expect(result).toContain('<p>No links or images</p>')
  })

  it('should resolve srcset with single entry and no descriptor', async () => {
    const value = '<img srcset="/photo.jpg">'
    const result = await transform(value)

    expect(result).toContain('https://example.com/photo.jpg')
  })

  it('should preserve commas inside srcset URLs', async () => {
    const srcset = [
      'https://substackcdn.com/image/fetch/w_424,c_limit,f_webp/https%3A%2F%2Fexample.com%2Fimg.png 424w',
      'https://substackcdn.com/image/fetch/w_848,c_limit,f_webp/https%3A%2F%2Fexample.com%2Fimg.png 848w',
    ].join(', ')
    const value = `<img srcset="${srcset}">`
    const result = await transform(value)

    expect(result).toContain(
      'https://substackcdn.com/image/fetch/w_424,c_limit,f_webp/https%3A%2F%2Fexample.com%2Fimg.png 424w',
    )
    expect(result).toContain(
      'https://substackcdn.com/image/fetch/w_848,c_limit,f_webp/https%3A%2F%2Fexample.com%2Fimg.png 848w',
    )
  })

  it('should not split Substack CDN srcset into fragments resolved against base URL', async () => {
    const srcset = [
      'https://substackcdn.com/image/fetch/w_424,c_limit,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ftest.png 424w',
      'https://substackcdn.com/image/fetch/w_848,c_limit,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ftest.png 848w',
    ].join(', ')
    const value = `<img srcset="${srcset}">`
    const result = await transform(value)

    expect(result).not.toContain('https://example.com/w_424')
    expect(result).not.toContain('https://example.com/c_limit')
    expect(result).not.toContain('https://example.com/f_webp')
  })
})
