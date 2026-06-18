import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext as defaultContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { resolveRelativeUrls } from './resolveRelativeUrls.js'

const baseContext: TransformContext = { ...defaultContext, baseUrl: 'https://example.com' }

describeForEachParser('resolveRelativeUrls', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [resolveRelativeUrls(context)])
  }

  it('should resolve relative href on anchors', async () => {
    const value = '<a href="/page">link</a>'
    const expected = '<a href="https://example.com/page">link</a>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve through the configured resolveUrlFn', async () => {
    const context: TransformContext = {
      ...baseContext,
      resolveUrlFn: (url) => `https://custom.test${url}`,
    }
    const value = '<a href="/page">link</a>'
    const expected = '<a href="https://custom.test/page">link</a>'

    expect(await transform(value, context)).toEqualHtml(expected)
  })

  it('should resolve relative src on images', async () => {
    const value = '<img src="/images/photo.jpg">'
    const expected = '<img src="https://example.com/images/photo.jpg">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve relative src on video elements', async () => {
    const value = '<video src="/video.mp4"></video>'
    const expected = '<video src="https://example.com/video.mp4"></video>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve relative src on audio elements', async () => {
    const value = '<audio src="/audio.mp3"></audio>'
    const expected = '<audio src="https://example.com/audio.mp3"></audio>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve relative src on source elements', async () => {
    const value = '<video><source src="/video.mp4"></video>'
    const expected = '<video><source src="https://example.com/video.mp4"></video>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve relative src on iframes', async () => {
    const value = '<iframe src="/embed"></iframe>'
    const expected = '<iframe src="https://example.com/embed"></iframe>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve relative video poster', async () => {
    const value = '<video poster="/thumb.jpg"></video>'
    const expected = '<video poster="https://example.com/thumb.jpg"></video>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve srcset entries', async () => {
    const value = '<img srcset="/small.jpg 300w, /large.jpg 600w">'
    const result = await transform(value)

    expect(result).toContain('https://example.com/small.jpg 300w')
    expect(result).toContain('https://example.com/large.jpg 600w')
  })

  it('should resolve srcset entries on source elements', async () => {
    const value = '<picture><source srcset="/small.webp 300w"><img src="/photo.jpg"></picture>'
    const expected = html`
      <picture>
        <source srcset="https://example.com/small.webp 300w">
        <img src="https://example.com/photo.jpg">
      </picture>
    `

    expect(await transform(value)).toEqualHtml(expected)
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

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should skip data: URLs', async () => {
    const value = '<img src="data:image/png;base64,abc">'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should skip mailto: URLs', async () => {
    const value = '<a href="mailto:test@example.com">email</a>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should skip tel: URLs', async () => {
    const value = '<a href="tel:+1234567890">call</a>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should skip javascript: URLs', async () => {
    const value = '<a href="javascript:void(0)">click</a>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should preserve fragment-only hrefs (in-article anchors)', async () => {
    const value = '<a href="#section">jump</a>'
    const result = await transform(value)

    expect(result).toContain('href="#section"')
    expect(result).not.toContain('https://example.com/#section')
  })

  it('should preserve fragment-only href even when no matching target exists', async () => {
    const value = '<a href="#missing">jump</a>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should preserve fragment-only href alongside an id target', async () => {
    const value = html`
      <a href="#section">jump</a>
      <h2 id="section">Section</h2>
    `
    const result = await transform(value)

    expect(result).toContain('href="#section"')
    expect(result).toContain('<h2 id="section">')
  })

  it('should still resolve hrefs that combine a path with a fragment', async () => {
    const value = '<a href="/page#section">jump</a>'
    const expected = '<a href="https://example.com/page#section">jump</a>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should handle protocol-relative URLs', async () => {
    const value = '<img src="//cdn.example.com/img.jpg">'
    const expected = '<img src="https://cdn.example.com/img.jpg">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should handle invalid URLs gracefully', async () => {
    const value = '<a href="://broken">link</a>'

    expect(await transform(value)).toContain('link')
  })

  it('should leave relative urls untouched when baseUrl is missing', async () => {
    const value = html`
      <a href="/page">link</a>
      <img src="/photo.jpg">
    `

    expect(await transform(value, defaultContext)).toBe(value)
  })

  it('should not modify html with no resolvable attributes', async () => {
    const value = '<p>No links or images</p>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should resolve srcset with single entry and no descriptor', async () => {
    const value = '<img srcset="/photo.jpg">'
    const expected = '<img srcset="https://example.com/photo.jpg">'

    expect(await transform(value)).toEqualHtml(expected)
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

  it('should be idempotent', async () => {
    const value = '<a href="/page">link</a>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
