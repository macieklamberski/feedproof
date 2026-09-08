import { expect, it } from 'bun:test'
import { baseContext as defaultContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { resolveRelativeUrls } from './resolveRelativeUrls.js'

const baseContext: TransformContext = { ...defaultContext, baseUrl: 'https://example.com' }

describeForEachParser('resolveRelativeUrls', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [resolveRelativeUrls(context)])
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

  it('should resolve relative data on object elements', async () => {
    const value = '<object data="/player.swf"></object>'
    const expected = '<object data="https://example.com/player.swf"></object>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve relative cite on blockquotes', async () => {
    const value = '<blockquote cite="/posts/123">quote</blockquote>'
    const expected = '<blockquote cite="https://example.com/posts/123">quote</blockquote>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve relative cite on q, ins and del elements', async () => {
    const value = html`
      <q cite="/quoted">quoted</q>
      <ins cite="/added">added</ins>
      <del cite="/removed">removed</del>
    `
    const expected = html`
      <q cite="https://example.com/quoted">quoted</q>
      <ins cite="https://example.com/added">added</ins>
      <del cite="https://example.com/removed">removed</del>
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should preserve an already-absolute cite', async () => {
    const value = '<blockquote cite="https://other.com/posts/123">quote</blockquote>'

    expect(await transform(value)).toEqualHtml(value)
  })

  // An anchor keeps a fragment-only href so it scrolls locally. A cite names the source of the
  // quotation instead, so a bare fragment belongs to the citing page and is resolved against it.
  it('should resolve a fragment-only cite against the base URL', async () => {
    const value = '<blockquote cite="#note">quote</blockquote>'
    const expected = '<blockquote cite="https://example.com/#note">quote</blockquote>'

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
    const expected = html`
      <img srcset="https://example.com/small.jpg 300w, https://example.com/large.jpg 600w">
    `

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve a relative srcset entry following an absolute one with no space', async () => {
    const value = '<img srcset="https://cdn.com/a.jpg 100w,/rel/b.jpg 200w">'
    const expected = '<img srcset="https://cdn.com/a.jpg 100w, https://example.com/rel/b.jpg 200w">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  // A url-less feed srcset ("…768w, 225w, 563w") makes the parser read the bare width
  // descriptors as candidate urls. Left in, each resolves to a page that does not exist.
  it('should drop descriptor-only srcset candidates instead of resolving them', async () => {
    const value = '<img srcset="https://cdn.com/a.jpg 768w,  225w,  563w,  1152w">'
    const expected = '<img srcset="https://cdn.com/a.jpg 768w">'

    expect(await transform(value)).toEqualHtml(expected)
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
    const expected = html`
      <img
        src="https://example.com/img.jpg"
        srcset="https://example.com/small.jpg 1x, https://example.com/large.jpg 2x"
      >
    `

    expect(await transform(value)).toEqualHtml(expected)
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

    expect(await transform(value)).toEqualHtml(value)
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

    expect(await transform(value)).toEqualHtml(value)
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
    const expected = '<a href="https://example.com/://broken">link</a>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave relative urls untouched when baseUrl is missing', async () => {
    const value = html`
      <a href="/page">link</a>
      <img src="/photo.jpg">
    `

    expect(await transform(value, defaultContext)).toEqualHtml(value)
  })

  // A protocol-relative url names its host already and needs only a scheme, so it is absolutised
  // whether or not the caller states a base.
  it('should give a protocol-relative url a scheme when baseUrl is missing', async () => {
    const value = html`
      <a href="//other.test/page">link</a>
      <img src="//cdn.test/photo.jpg">
    `
    const expected = html`
      <a href="https://other.test/page">link</a>
      <img src="https://cdn.test/photo.jpg">
    `

    expect(await transform(value, defaultContext)).toEqualHtml(expected)
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

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should not split Substack CDN srcset into fragments resolved against base URL', async () => {
    const srcset = [
      'https://substackcdn.com/image/fetch/w_424,c_limit,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ftest.png 424w',
      'https://substackcdn.com/image/fetch/w_848,c_limit,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ftest.png 848w',
    ].join(', ')
    const value = `<img srcset="${srcset}">`

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave a relative cite untouched when baseUrl is missing', async () => {
    const value = '<blockquote cite="/posts/123">quote</blockquote>'

    expect(await transform(value, defaultContext)).toEqualHtml(value)
  })

  it('should give a protocol-relative cite a scheme when baseUrl is missing', async () => {
    const value = '<blockquote cite="//www.other.test/posts/123">quote</blockquote>'
    const expected = '<blockquote cite="https://www.other.test/posts/123">quote</blockquote>'

    expect(await transform(value, defaultContext)).toEqualHtml(expected)
  })

  it('should resolve a relative href on an svg image', async () => {
    const value = '<svg><image href="/img.png"></image></svg>'
    const expected = '<svg><image href="https://example.com/img.png"></image></svg>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve a relative xlink:href on an svg image', async () => {
    const value = '<svg><image xlink:href="/img.png"></image></svg>'
    const expected = '<svg><image xlink:href="https://example.com/img.png"></image></svg>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should resolve href and leave xlink:href when an svg image carries both', async () => {
    const value = '<svg><image href="/img.png" xlink:href="/legacy.png"></image></svg>'
    const expected =
      '<svg><image href="https://example.com/img.png" xlink:href="/legacy.png"></image></svg>'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = '<a href="/page">link</a>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
